import { isCarsTranslation } from '../../Config.ts';

export const OBJECT_ID_REGEX = /^0x[a-fA-F0-9]{64}$/;

export function isValidObjectId(id: string): boolean {
  return OBJECT_ID_REGEX.test(id.trim());
}

export function hasMinLen(v: string, min: number): boolean {
  return v.trim().length >= min;
}

export function hasMaxLen(v: string, max: number): boolean {
  return v.trim().length <= max;
}

export function isNonEmpty(v: string): boolean {
  return v.trim().length > 0;
}

const CARS_CONTENT_JSON = JSON.stringify(
  {
    easy_publish: {
      publish: {
        targets: [
          {
            domain: 'cars.izipublish.com',
            base_url: 'https://cars.izipublish.com',
            enabled: true,
          },
        ],
      },
    },
  },
  null,
  2
);

export function isCarsInstance(): boolean {
  return isCarsTranslation();
}

export function getCarsContentJson(): string {
  return CARS_CONTENT_JSON;
}

export function defaultContent(isCars: boolean): string {
  return isCars ? CARS_CONTENT_JSON : '';
}

export function parseAddressList(value?: string): string[] {
  return (
    value
      ?.split(',')
      .map((v) => v.trim())
      .filter((v) => OBJECT_ID_REGEX.test(v)) ?? []
  );
}
