import { render } from '@testing-library/react';
import { useGetSnapshotsByDates, useContentListQuery } from 'services/Content/ContentQueries';
import SetUpDateStep from './SetUpDateStep';
import { useAddTemplateContext } from '../AddTemplateContext';
import { defaultContentItem, defaultSnapshotsByDateResponse } from 'testingHelpers';

jest.mock('services/Content/ContentQueries', () => ({
  useGetSnapshotsByDates: jest.fn(),
  useContentListQuery: jest.fn(),
}));

jest.mock('../AddTemplateContext', () => ({
  useAddTemplateContext: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  Outlet: () => <></>,
  useHref: () => 'insights/content/templates',
}));

// dayJs is an absolute pain, just mock it.
jest.mock('dayjs', () => () => ({
  fromNow: () => '2024-01-22',
  format: () => '2024-01-22',
  endOf: () => '2024-01-22',
  isBefore: () => true,
}));

it('expect Set snapshot date step to render dates', () => {
  (useGetSnapshotsByDates as jest.Mock).mockImplementation(() => ({
    data: defaultSnapshotsByDateResponse,
    mutateAsync: () => undefined,
  }));

  (useContentListQuery as jest.Mock).mockImplementation(() => ({
    data: {
      data: [defaultContentItem],
      meta: { limit: 10, offset: 0, count: 1 },
      isLoading: false,
    },
  }));

  (useAddTemplateContext as jest.Mock).mockImplementation(() => ({
    templateRequest: { date: '2024-01-22' },
    setTemplateRequest: () => undefined,
    selectedRedhatRepos: new Set(),
    selectedCustomRepos: new Set(),
  }));

  const { queryByText, getByRole } = render(<SetUpDateStep />);
  expect(queryByText('Select date for snapshotted repositories')).toBeInTheDocument();

  const dateInput = getByRole('textbox', { name: 'Date picker' });
  expect(dateInput).toBeInTheDocument();
  expect(dateInput).toHaveAttribute('value', '2024-01-22');
});

it('expect Set snapshot date step to render use latest', () => {
  (useGetSnapshotsByDates as jest.Mock).mockImplementation(() => ({
    data: defaultSnapshotsByDateResponse,
    mutateAsync: () => undefined,
  }));

  (useContentListQuery as jest.Mock).mockImplementation(() => ({
    data: {
      data: [defaultContentItem],
      meta: { limit: 10, offset: 0, count: 1 },
      isLoading: false,
    },
  }));

  (useAddTemplateContext as jest.Mock).mockImplementation(() => ({
    templateRequest: { date: '', use_latest: true },
    setTemplateRequest: () => undefined,
    selectedRedhatRepos: new Set(),
    selectedCustomRepos: new Set(),
  }));

  const { queryByText } = render(<SetUpDateStep />);

  expect(queryByText('Select date for snapshotted repositories')).toBeInTheDocument();
});
