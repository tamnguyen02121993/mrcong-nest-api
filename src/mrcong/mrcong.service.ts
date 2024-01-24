import { JSDOM } from 'jsdom';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { writeFile, readFile } from 'fs/promises';
import { Readable } from 'stream';
import { join } from 'path';
import {
  CategoryResponse,
  ConvertLinkResponse,
  FirstItemDetailResponse,
  ItemDetailJsonResponse,
  ItemDetailResponse,
  ItemResponse,
  ItemsWithTrendingResponse,
  RelatedItemResponse,
  TagResponse,
  TrendingItemResponse,
} from '../models/responses';

@Injectable()
export class MrcongService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async getCategories(): Promise<CategoryResponse[]> {
    const { data: rawData } = await this.httpService.axiosRef.get<string>(
      this.configService.get<string>('HOST'),
      {
        responseType: 'text',
      },
    );
    const { window } = new JSDOM(rawData);
    const categories = window.document.querySelectorAll(
      'ul.sub-menu.menu-sub-content > li.menu-item > a',
    );
    const categoriesLength = categories.length;
    const textCategories: CategoryResponse[] = [];
    for (let index = 0; index < categoriesLength; index++) {
      const item = categories[index];
      const splitString = item.getAttribute('href').split('/');
      const category = splitString[splitString.length - 2];
      textCategories.push({
        name: item.textContent,
        category,
        href: item.getAttribute('href'),
      });
    }

    return textCategories;
  }

  async getItemsByCategoryAndPageNumber(
    category: string,
    pageNumber: number,
  ): Promise<ItemsWithTrendingResponse> {
    if (pageNumber > 100 || pageNumber < 1) {
      pageNumber = 1;
    }
    let defaultCategory = category;
    if (!category) {
      defaultCategory = 'xiuren';
    }
    const { data: rawData } = await this.httpService.axiosRef.get(
      `${this.configService.get<string>(
        'HOST',
      )}/tag/${defaultCategory}/page/${pageNumber}`,
      {
        responseType: 'text',
      },
    );

    const { window } = new JSDOM(rawData);
    const document = window.document;
    const items = document.querySelectorAll(
      'div.post-listing.archive-box > article.item-list > .post-box-title > a',
    );

    const images = document.querySelectorAll(
      'div.post-listing.archive-box > article.item-list > .post-thumbnail > a > img',
    );

    const itemsLength = items.length;
    const links: ItemResponse[] = [];

    for (let index = 0; index < itemsLength; index++) {
      // Ignore index === 12 because it is iframe advertisement
      // So I will add 2 from index + 1 >= 12 to re-caculate index
      const tagIndex = index + 1 >= 12 ? index + 2 : index + 1;
      const item = items[index];
      const image = images[index];
      const tagElements = document.querySelectorAll(
        `div.post-listing.archive-box > article.item-list:nth-child(${tagIndex}) > .post-meta > .post-cats > a`,
      );
      links.push({
        title: item.textContent,
        href: item.getAttribute('href'),
        coverImage: image.getAttribute('src'),
        page: pageNumber,
        category: defaultCategory,
        tags: this._getTags(tagElements),
      });
    }

    return {
      items: links,
      trending: this._getTrendingItems(window.document),
    };
  }

  async getItemDetail(
    link: string,
    internal: boolean = false,
  ): Promise<ItemDetailResponse> {
    // First page
    let finalRawData;
    const { data: rawData, request } = await this.httpService.axiosRef.get(
      link,
      {
        responseType: 'text',
      },
    );
    finalRawData = rawData;
    if (internal) {
      link = request.res.responseUrl;
      const { data: xdata } = await this.httpService.axiosRef.get(link, {
        responseType: 'text',
      });
      finalRawData = xdata;
    }

    const { window } = new JSDOM(finalRawData);
    const document = window.document;
    const downloadLink = document.querySelector('div.box.info + p > a');
    const totalPageElements = document.querySelectorAll(
      '.page-link > .post-page-numbers',
    );
    const imagesFirstPageElements = document.querySelectorAll(
      'div.post-inner > div.entry > p > img.aligncenter',
    );
    const imageList = [];

    // Get all images from first page
    for (let index = 0; index < imagesFirstPageElements.length; index++) {
      imageList.push(imagesFirstPageElements[index].getAttribute('src'));
    }

    const promiseList = [];
    const totalPages = totalPageElements.length / 2;
    // Ignore page 1
    for (let index = 1; index < totalPages; index++) {
      const pageLink = `${link}${index + 1}/`;

      promiseList.push(
        this.httpService.axiosRef.get(pageLink, {
          responseType: 'text',
        }),
      );
    }

    const anotherPageData = await Promise.all(promiseList);

    for (let i = 0; i < anotherPageData.length; i++) {
      const { data: anotherRawData } = anotherPageData[i];
      const { window: windowAnotherPage } = new JSDOM(anotherRawData);
      const imageElements = windowAnotherPage.document.querySelectorAll(
        'div.page-link + p > img',
      );
      for (let index = 0; index < imageElements.length; index++) {
        imageList.push(imageElements[index].getAttribute('src'));
      }
    }
    const invalidText = ['\n', ' '];
    const validIndex = 1;
    const infoElement = document.querySelector('.box-inner-block');
    let filterInfo = [...infoElement.childNodes].filter((n: Text) => {
      return (
        (n.nodeName === '#text' && !invalidText.includes(n.data)) ||
        n.nodeName === 'STRONG'
      );
    });
    filterInfo = filterInfo.slice(validIndex, filterInfo.length - 5);
    const infoArr = filterInfo.map((x: Text | HTMLElement, i) => {
      if (x.nodeName === '#text') {
        return (x as Text).data;
      }

      if (x.nodeName === 'STRONG') {
        return (x as HTMLElement).textContent;
      }
    });
    const infoData = [];
    const infoArrLength = infoArr.length;
    for (let index = 0; index < infoArrLength; index += 2) {
      infoData.push(`${infoArr[index]} ${infoArr[index + 1]}`);
    }

    const passwordElement = infoElement.querySelector('input');
    infoData.push(`Password Unrar: ${passwordElement.value}`);
    const href = downloadLink.getAttribute('href');
    let result: ConvertLinkResponse = { originalLink: '', convertedLink: '' };
    if (
      href.startsWith('https://ouo.io') ||
      href.startsWith('https://ouo.press')
    ) {
      result = await this.convertLink(href);
    } else {
      result = {
        originalLink: href,
        convertedLink: href,
      };
    }

    const tagElements = document.querySelectorAll(
      '.post-inner > .post-tag > a',
    );

    return {
      link,
      downloadLink: result,
      info: infoData,
      tags: this._getTags(tagElements),
      imageList,
    } as ItemDetailResponse;
  }

  async getFirstItemDetail(
    link: string,
    internal: boolean = false,
  ): Promise<ItemDetailResponse> {
    // First page
    let finalRawData;
    const { data: rawData, request } = await this.httpService.axiosRef.get(
      link,
      {
        responseType: 'text',
      },
    );
    finalRawData = rawData;
    if (internal) {
      link = request.res.responseUrl;
      const { data: xdata } = await this.httpService.axiosRef.get(link, {
        responseType: 'text',
      });
      finalRawData = xdata;
    }

    const { window } = new JSDOM(finalRawData);
    const document = window.document;
    const downloadLink = document.querySelector('div.box.info + p > a');
    const totalPageElements = document.querySelectorAll(
      '.page-link > .post-page-numbers',
    );
    const imagesFirstPageElements = document.querySelectorAll(
      'div.post-inner > div.entry > p > img.aligncenter',
    );
    const imageList = [];

    // Get all images from first page
    for (let index = 0; index < imagesFirstPageElements.length; index++) {
      imageList.push(imagesFirstPageElements[index].getAttribute('src'));
    }

    const totalPages = totalPageElements.length / 2;

    const invalidText = ['\n', ' '];
    const validIndex = 1;
    const infoElement = document.querySelector('.box-inner-block');
    let filterInfo = [...infoElement.childNodes].filter((n: Text) => {
      return (
        (n.nodeName === '#text' && !invalidText.includes(n.data)) ||
        n.nodeName === 'STRONG'
      );
    });
    filterInfo = filterInfo.slice(validIndex, filterInfo.length - 5);
    const infoArr = filterInfo.map((x: Text | HTMLElement, i) => {
      if (x.nodeName === '#text') {
        return (x as Text).data;
      }

      if (x.nodeName === 'STRONG') {
        return (x as HTMLElement).textContent;
      }
    });
    const infoData = [];
    const infoArrLength = infoArr.length;
    for (let index = 0; index < infoArrLength; index += 2) {
      infoData.push(`${infoArr[index]} ${infoArr[index + 1]}`);
    }

    const passwordElement = infoElement.querySelector('input');
    infoData.push(`Password Unrar: ${passwordElement.value}`);
    const href = downloadLink.getAttribute('href');
    let result: ConvertLinkResponse = { originalLink: '', convertedLink: '' };
    if (
      href.startsWith('https://ouo.io') ||
      href.startsWith('https://ouo.press')
    ) {
      result = await this.convertLink(href);
    } else {
      result = {
        originalLink: href,
        convertedLink: href,
      };
    }

    const tagElements = document.querySelectorAll(
      '.post-inner > .post-tag > a',
    );

    return {
      link,
      downloadLink: result,
      info: infoData,
      tags: this._getTags(tagElements),
      imageList,
      totalPages,
    } as FirstItemDetailResponse;
  }

  async getAnotherItemDetail(
    link: string,
    internal: boolean = false,
  ): Promise<string[]> {
    let finalRawData;
    const { data: rawData, request } = await this.httpService.axiosRef.get(
      link,
      {
        responseType: 'text',
      },
    );
    finalRawData = rawData;
    if (internal) {
      link = request.res.responseUrl;
      const { data: xdata } = await this.httpService.axiosRef.get(link, {
        responseType: 'text',
      });
      finalRawData = xdata;
    }

    const { window } = new JSDOM(finalRawData);
    const document = window.document;
    const imageElements = document.querySelectorAll('div.page-link + p > img');
    const imageList = [];
    for (let index = 0; index < imageElements.length; index++) {
      imageList.push(imageElements[index].getAttribute('src'));
    }
    return imageList;
  }

  async convertLink(url: string): Promise<ConvertLinkResponse> {
    const { data } = await this.httpService.axiosRef.post(
      this.configService.get<string>('CONVERT_LINK_URL'),
      {
        url,
      },
    );

    return {
      originalLink: data.original_link,
      convertedLink: data.converted_link,
    };
  }

  async getJsonDataByCategory(
    category: string,
    start: number,
    end: number,
  ): Promise<ItemDetailJsonResponse[]> {
    let defaultCategory = category;
    if (end <= start) return [];
    if (!category) {
      defaultCategory = 'xiuren';
    }

    const numberOrders = { xiuren: 'xiuren', ishow: 'ishow' };
    const vols = {
      feilin: 'feilin',
      mfstar: 'mfstar',
      imiss: 'imiss',
      mygirl: 'mygirl',
      youmi: 'youmi',
      huayang: 'huayang',
      xiaoyu: 'xiaoyu',
      creamsoda: 'creamsoda-mimmi',
      'pure-media': 'pure-media',
    };

    const categoryMapping =
      numberOrders[defaultCategory] ?? vols[defaultCategory];
    let subPath = numberOrders[defaultCategory]
      ? 'no'
      : vols[defaultCategory]
        ? 'vol'
        : null;
    if (!subPath) return [];
    const data: ItemDetailJsonResponse[] = [];
    for (let i = start; i <= end; i++) {
      const link = `${this.configService.get<string>(
        'HOST',
      )}/${categoryMapping}-${subPath}-${i}`;
      try {
        const itemData = await this.getItemDetail(link, true);
        const infoData = itemData.info.map((x) => x.split(':')[1].trim());
        data.push({
          link: itemData.link,
          shortLink: link,
          downloadLink: itemData.downloadLink,
          category: defaultCategory,
          info: {
            galleryName: infoData[0],
            modelName: infoData[1],
            totalImages: infoData[2],
            size: infoData[3],
            imageDimension: infoData[4],
          },
          tags: itemData.tags,
          images: itemData.imageList,
        });
      } catch (error) {
        data.push({
          link: '',
          shortLink: link,
          downloadLink: { convertedLink: '', originalLink: '' },
          category: defaultCategory,
          info: {
            galleryName: '',
            modelName: '',
            totalImages: '',
            size: '',
            imageDimension: '',
          },
          tags: [],
          images: [],
        });
      }
    }

    return data;
  }

  async getMaxOfCategory(category: string): Promise<number> {
    let defaultCategory = category;
    if (!category) {
      defaultCategory = 'xiuren';
    }

    const { items: links } = await this.getItemsByCategoryAndPageNumber(
      defaultCategory,
      1,
    );
    const numberOrders = { xiuren: 'xiuren', ishow: 'ishow' };
    const vols = {
      feilin: 'feilin',
      mfstar: 'mfstar',
      imiss: 'imiss',
      mygirl: 'mygirl',
      youmi: 'youmi',
      huayang: 'huayang',
      xiaoyu: 'xiaoyu',
      creamsoda: 'creamsoda-mimmi',
      'pure-media': 'pure-media',
    };
    const categoryMapping =
      numberOrders[defaultCategory] ?? vols[defaultCategory];
    let subPath = numberOrders[defaultCategory]
      ? 'no'
      : vols[defaultCategory]
        ? 'vol'
        : null;
    if (!subPath) return 0;
    const ids = links.map(
      (x) =>
        +x.href
          .replace(
            `${this.configService.get<string>(
              'HOST',
            )}/${categoryMapping}-${subPath}-`,
            '',
          )
          .split('-')[0],
    );

    return Math.max(...ids.filter((x) => !isNaN(x)));
  }

  async mergeJsonData(
    jsonFiles: Express.Multer.File[],
  ): Promise<ItemDetailJsonResponse[]> {
    const mergedData: ItemDetailJsonResponse[] = [];
    for (let index = 0; index < jsonFiles.length; index++) {
      const fileBuffer = Buffer.from(jsonFiles[index].buffer);
      const fileStream = Readable.from(fileBuffer);
      const path = join(process.cwd(), `temp${index}.json`);
      await writeFile(`./temp${index}.json`, fileStream);
      const dataString = await readFile(path, {
        encoding: 'utf-8',
      });
      const data = JSON.parse(dataString) as ItemDetailJsonResponse[];
      mergedData.push(...data);
    }

    return mergedData;
  }

  async getItemsByPageNumber(
    pageNumber: number,
  ): Promise<ItemsWithTrendingResponse> {
    if (pageNumber > 100 || pageNumber < 1) {
      pageNumber = 1;
    }
    const { data: rawData } = await this.httpService.axiosRef.get(
      `${this.configService.get<string>('HOST')}/page/${pageNumber}`,
      {
        responseType: 'text',
      },
    );

    const { window } = new JSDOM(rawData);
    const document = window.document;
    const items = document.querySelectorAll(
      'div.post-listing.archive-box > article.item-list > .post-box-title > a',
    );

    const images = document.querySelectorAll(
      'div.post-listing.archive-box > article.item-list > .post-thumbnail > a > img',
    );

    const itemsLength = items.length;
    const links: ItemResponse[] = [];

    for (let index = 0; index < itemsLength; index++) {
      // Ignore index === 12 because it is iframe advertisement
      // So I will add 2 from index + 1 >= 12 to re-caculate index
      const tagIndex = index + 1 >= 12 ? index + 2 : index + 1;
      const item = items[index];
      const image = images[index];
      const tagElements = document.querySelectorAll(
        `div.post-listing.archive-box > article.item-list:nth-child(${tagIndex}) > .post-meta > .post-cats > a`,
      );
      links.push({
        title: item.textContent,
        href: item.getAttribute('href'),
        coverImage: image.getAttribute('src'),
        page: pageNumber,
        category: 'ALL',
        tags: this._getTags(tagElements),
      });
    }

    return {
      items: links,
      trending: this._getTrendingItems(window.document),
    };
  }

  async getJsonData(): Promise<ItemDetailJsonResponse[]> {
    const items: ItemResponse[] = [];
    for (let index = 1; index <= 5; index++) {
      const { items: itemsInPage } = await this.getItemsByPageNumber(index);
      items.push(...itemsInPage);
    }
    const data: ItemDetailJsonResponse[] = [];
    const itemsLength = items.length;
    for (let i = 0; i < itemsLength; i++) {
      const link = items[i].href;
      try {
        const itemData = await this.getItemDetail(link, true);
        const infoData = itemData.info.map((x) => x.split(':')[1].trim());
        data.push({
          link: itemData.link,
          shortLink: link,
          downloadLink: itemData.downloadLink,
          category: 'ALL',
          info: {
            galleryName: infoData[0],
            modelName: infoData[1],
            totalImages: infoData[2],
            size: infoData[3],
            imageDimension: infoData[4],
          },
          tags: itemData.tags,
          images: itemData.imageList,
        });
      } catch (error) {
        data.push({
          link: '',
          shortLink: link,
          downloadLink: { convertedLink: '', originalLink: '' },
          category: 'ALL',
          info: {
            galleryName: '',
            modelName: '',
            totalImages: '',
            size: '',
            imageDimension: '',
          },
          images: [],
          tags: [],
        });
      }
    }

    return data;
  }

  _getTags(tagElements: NodeListOf<Element>): TagResponse[] {
    const tags = [];
    const tagElementsLength = tagElements.length;
    for (let i = 0; i < tagElementsLength; i++) {
      tags.push({
        tagHref: tagElements[i].getAttribute('href'),
        tagName: tagElements[i].textContent,
      });
    }

    return tags;
  }

  async getItemsByTagNameAndPageNumber(
    tag: string,
    pageNumber: number,
  ): Promise<ItemsWithTrendingResponse> {
    if (pageNumber > 100 || pageNumber < 1) {
      pageNumber = 1;
    }
    const { data: rawData } = await this.httpService.axiosRef.get(
      `${this.configService.get<string>('HOST')}/tag/${tag}/page/${pageNumber}`,
      {
        responseType: 'text',
      },
    );

    const { window } = new JSDOM(rawData);
    const document = window.document;
    const items = document.querySelectorAll(
      'div.post-listing.archive-box > article.item-list > .post-box-title > a',
    );

    const images = document.querySelectorAll(
      'div.post-listing.archive-box > article.item-list > .post-thumbnail > a > img',
    );

    const itemsLength = items.length;
    const links: ItemResponse[] = [];

    for (let index = 0; index < itemsLength; index++) {
      // Ignore index === 12 because it is iframe advertisement
      // So I will add 2 from index + 1 >= 12 to re-caculate index
      const tagIndex = index + 1 >= 12 ? index + 2 : index + 1;
      const item = items[index];
      const image = images[index];
      const tagElements = document.querySelectorAll(
        `div.post-listing.archive-box > article.item-list:nth-child(${tagIndex}) > .post-meta > .post-cats > a`,
      );
      links.push({
        title: item.textContent,
        href: item.getAttribute('href'),
        coverImage: image.getAttribute('src'),
        page: pageNumber,
        category: 'ALL',
        tags: this._getTags(tagElements),
      });
    }

    return {
      items: links,
      trending: this._getTrendingItems(document),
    };
  }

  async getRelatedItems(link: string): Promise<RelatedItemResponse[]> {
    // First page
    const { data } = await this.httpService.axiosRef.get(
      `${link}/?relatedposts=1`,
    );
    const relatedItems: RelatedItemResponse[] = data.items.map((x) => {
      return {
        id: x.id,
        url: x.url,
        urlMetadata: {
          origin: x.url_meta.origin,
          position: x.url_meta.position,
        },
        title: x.title,
        author: x.author,
        date: x.date,
        context: x.context,
        blockContext: {
          text: x.block_context.text,
          link: x.block_context.link,
        },
        img: {
          alt: x.img.alt_text,
          src: x.img.src,
          width: x.img.width,
          height: x.img.height,
          srcSet: x.img.srcset,
        },
      } as RelatedItemResponse;
    });

    return relatedItems;
  }

  _getTrendingItems(document: Document): TrendingItemResponse[] {
    const trendingElements = document.querySelectorAll(
      '.widget-container > .widgets-grid-layout > .widget-grid-view-image',
    );
    const trendingItems: TrendingItemResponse[] = [];
    const trendingItemsLength = trendingElements.length;
    for (let i = 0; i < trendingItemsLength; i++) {
      const aElement = trendingElements[i].querySelector('a');
      const imgElement = aElement.querySelector('img');
      trendingItems.push({
        href: aElement.getAttribute('href'),
        title: aElement.getAttribute('title'),
        img: {
          src: imgElement.getAttribute('src'),
          srcSet: imgElement.getAttribute('srcset'),
        },
      });
    }
    return trendingItems;
  }

  async getTrendingItemsUsingQuery(): Promise<TrendingItemResponse[]> {
    const { data: rawData } = await this.httpService.axiosRef.get(
      `${this.configService.get<string>('HOST')}`,
      {
        responseType: 'text',
      },
    );

    const { window } = new JSDOM(rawData);
    const document = window.document;
    return this._getTrendingItems(document);
  }
}
