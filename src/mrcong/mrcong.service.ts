import { JSDOM } from 'jsdom';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MrcongService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) { }

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

  async getItemDetail(link: string) {
    // First page
    const { data: rawData } = await this.httpService.axiosRef.get(link, {
      responseType: 'text',
    });

    const { window } = new JSDOM(rawData);
    const downloadLink = window.document.querySelector('div.box.info + p > a');
    const totalPageElements = window.document.querySelectorAll(
      '.page-link > .post-page-numbers',
    );
    const imagesFirstPageElements = window.document.querySelectorAll(
      'div.box.info + p + p > img',
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

    const ouoLink = downloadLink.getAttribute('href')
    const result = await this.convertLink(ouoLink)
    return {
      downloadLink: result.convertedLink,
      imageList,
      info: infoData,
    };
  }

  async convertLink(url: string) {
    const { data } = await this.httpService.axiosRef.post(this.configService.get<string>('CONVERT_LINK_URL'), {
      url
    });

    return {
      originalLink: data.original_link,
      convertedLink: data.converted_link
    }
  }
}
