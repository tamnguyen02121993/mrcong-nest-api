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

export class ItemsWithTrendingResponse {
  items: ItemResponse[];
  trending: TrendingItemResponse[];
}

export class TrendingItemResponse {
  title: string;
  href: string;
  img: {
    src: string;
    srcSet: string;
  };
}

export class RelatedItemResponse {
  id: number;
  url: string;
  urlMetadata: {
    origin: number;
    position: number;
  };
  title: string;
  author: string;
  date: string;
  context: string;
  blockContext: {
    text: string;
    link: string;
  };
  img: {
    alt: string;
    src: string;
    width: number;
    height: number;
    srcSet: string;
  };
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

export class FirstItemDetailResponse extends ItemDetailResponse {
  totalPages: number;
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
