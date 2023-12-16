export class TagResponse {
  tagName: string;
  tagHref: string;
}

export class CategoryResponse {
  name: string;
  category: string;
  href: string;
}

export class ItemResponse {
  title: string;
  href: string;
  coverImage: string;
  page: number;
  category: string;
  tags: TagResponse[];
}

export class ConvertLinkResponse {
  originalLink: string;
  convertedLink: string;
}

export class ItemDetailResponse {
  link: string;
  downloadLink: ConvertLinkResponse;
  imageList: string[];
  info: string[];
  tags: TagResponse[];
}

export class ItemDetailJsonResponse {
  link: string;
  shortLink: string;
  downloadLink: ConvertLinkResponse;
  category: string;
  images: string[];
  tags: TagResponse[];
  info: {
    galleryName: string;
    modelName: string;
    totalImages: string;
    size: string;
    imageDimension: string;
  };
}
