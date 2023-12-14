import { JSDOM } from 'jsdom';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { writeFile, readFile } from 'fs/promises';
import { Readable } from 'stream';
import { join } from 'path';

@Injectable()
export class MrcongService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async getCategories() {
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
    const textCategories = [];
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

  async getItemsByPageNumber(category: string, pageNumber: number) {
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
    const items = window.document.querySelectorAll(
      'div.post-listing.archive-box > article.item-list > .post-box-title > a',
    );

    const images = window.document.querySelectorAll(
      'div.post-listing.archive-box > article.item-list > .post-thumbnail > a > img',
    );

    const itemsLength = items.length;
    const links = [];

    for (let index = 0; index < itemsLength; index++) {
      const item = items[index];
      const image = images[index];
      links.push({
        title: item.textContent,
        href: item.getAttribute('href'),
        coverImage: image.getAttribute('src'),
        page: pageNumber,
        category: defaultCategory,
      });
    }

    return links;
  }

  async getItemDetail(link: string, internal: boolean = false) {
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
    const downloadLink = window.document.querySelector('div.box.info + p > a');
    const totalPageElements = window.document.querySelectorAll(
      '.page-link > .post-page-numbers',
    );
    const imagesFirstPageElements = window.document.querySelectorAll(
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

    const infoValid = [
      'Gallery Name:',
      'Model Name:',
      'Total Images:',
      'Size:',
      'Image Dimension:',
    ];
    const invalidText = ['\n', ' '];
    const validIndex = 1;
    const infoElement = window.document.querySelector('.box-inner-block');
    const filterInfo = [...infoElement.childNodes]
      .filter((n: Text) => {
        return n.nodeName === '#text' && !invalidText.includes(n.data);
      })
      .slice(validIndex, infoValid.length);
    const infoData = filterInfo.map((x: Text, i) => {
      return `${infoValid[i]} ${x.data}`;
    });

    const passwordElement = infoElement.querySelector('input');
    infoData.push(`Password Unrar: ${passwordElement.value}`);
    const ouoLink = downloadLink.getAttribute('href');
    const result = await this.convertLink(ouoLink);
    return {
      link,
      downloadLink: result,
      imageList,
      info: infoData,
    };
  }

  async convertLink(url: string) {
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

  async getJsonData(category: string, start: number, end: number) {
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
    const data = [];
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
          images: itemData.imageList,
        });
      } catch (error) {
        data.push({
          link: '',
          shortLink: link,
          downloadLink: '',
          category: defaultCategory,
          info: {
            galleryName: '',
            modelName: '',
            totalImages: '',
            size: '',
            imageDimension: '',
          },
          images: [],
        });
      }
    }

    return data;
  }

  async getMaxOfCategory(category: string) {
    let defaultCategory = category;
    if (!category) {
      defaultCategory = 'xiuren';
    }

    const links = await this.getItemsByPageNumber(defaultCategory, 1);
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

  async mergeJsonData(jsonFiles: Express.Multer.File[]) {
    const mergedData = [];
    for (let index = 0; index < jsonFiles.length; index++) {
      const fileBuffer = Buffer.from(jsonFiles[index].buffer);
      const fileStream = Readable.from(fileBuffer);
      const path = join(process.cwd(), `temp${index}.json`);
      await writeFile(`./temp${index}.json`, fileStream);
      const dataString = await readFile(path, {
        encoding: 'utf-8',
      });
      const data = JSON.parse(dataString);
      mergedData.push(data);
    }

    return mergedData;
  }
}
