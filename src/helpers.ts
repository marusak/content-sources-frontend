import dayjs from 'dayjs';

// Removes null values and builds url params from a given object.
export const objectToUrlParams = (obj: {
  [key: string]: string | string[] | undefined;
}): string => {
  const keyList = Object.keys(obj).filter((key) => !!obj[key]);
  // Check each item for falsey value and filter

  if (!keyList.length) return '';

  let items = '';
  keyList.forEach((key, index) => {
    const toAdd =
      obj[key] instanceof Array
        ? obj[key].map((value) => `${key}=${value}`).join('&')
        : `${key}=${obj[key]}`;

    items += `${toAdd}${index !== keyList.length - 1 ? '&' : ''}`;
  });
  return items;
};

export const formatDateDDMMMYYYY = (date: string, withTime?: boolean): string => {
  const d = dayjs(date);
  if (d.isBefore(dayjs('0001-01-02'))) {
    return `01 Jan 0001${withTime ? ' - 00:00:00' : ''}`;
  }

  return d.format(`DD MMM YYYY${withTime ? ' - HH:mm:ss' : ''}`);
};

export const formatTemplateDate = (date: string): string =>
  dayjs(date).format('YYYY-MM-DDTHH:mm:ssZ');

export const formatDateForPicker = (date: string | null | undefined): string => {
  if (typeof date !== 'string' || date === '') {
    return '';
  }

  const d = dayjs(date);
  if (d.isBefore(dayjs('0001-01-02'))) {
    return '0001-01-01';
  }

  return d.format('YYYY-MM-DD');
};

export const formatDateUTC = (date: string): string => {
  const d = dayjs(date);
  if (d.isBefore(dayjs('0001-01-02'))) {
    return '01 Jan 0001 - 00:00:00 (UTC)';
  }

  const offset = d.utcOffset();
  const utc = d.subtract(offset, 'minutes');
  return utc.format('DD MMM YYYY - HH:mm:ss [(UTC)]');
};

export const isDateValid = (date: string): boolean =>
  RegExp(/^\d{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/).test(date) &&
  dayjs(date).isBefore(dayjs().endOf('day'));

export const reduceStringToCharsWithEllipsis = (str: string, maxLength: number = 50) =>
  str.length > maxLength ? str.split('').slice(0, maxLength).join('') + '...' : str;

// Removes any cases of 3+ line breaks and replaces them with 2
export const formatDescription = (description: string): string =>
  description.replace(/\n{3,}/g, '\n\n');

export const isEPELUrl = (repoUrl) => {
  const epelUrls = [
    'https://dl.fedoraproject.org/pub/epel/10/Everything/x86_64/',
    'https://dl.fedoraproject.org/pub/epel/9/Everything/x86_64/',
    'https://dl.fedoraproject.org/pub/epel/8/Everything/x86_64/',
  ];
  return epelUrls.includes(repoUrl);
};
