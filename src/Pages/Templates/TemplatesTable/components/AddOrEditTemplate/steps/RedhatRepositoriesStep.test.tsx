import { render } from '@testing-library/react';
import { useAddTemplateContext } from '../AddTemplateContext';
import { defaultContentItem, defaultTemplateItem } from 'testingHelpers';
import { useContentListQuery } from 'services/Content/ContentQueries';
import RedhatRepositoriesStep from './RedhatRepositoriesStep';

jest.mock('services/Content/ContentQueries', () => ({
  useContentListQuery: jest.fn(),
}));

jest.mock('Pages/Repositories/ContentListTable/components/StatusIcon', () => () => 'StatusIcon');

jest.mock('../AddTemplateContext', () => ({
  useAddTemplateContext: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  Outlet: () => <></>,
  useHref: () => 'insights/content/templates',
}));

it('expect RedhatRepositoriesStep to render correctly', () => {
  (useContentListQuery as jest.Mock).mockImplementation(() => ({
    data: {
      data: [defaultContentItem],
      meta: { limit: 10, offset: 0, count: 1 },
      isLoading: false,
    },
  }));

  (useAddTemplateContext as jest.Mock).mockImplementation(() => ({
    templateRequest: defaultTemplateItem,
    setSelectedRedhatRepos: () => undefined,
    selectedRedhatRepos: new Set([defaultTemplateItem.uuid]),
    hardcodedRedhatRepositoryUUIDS: new Set([defaultTemplateItem.uuid]),
  }));

  const { getByRole, getByText } = render(<RedhatRepositoriesStep />);

  const firstCheckboxInList = getByRole('checkbox', { name: 'Select row 0' });

  expect(firstCheckboxInList).toBeInTheDocument();

  expect(getByText(defaultContentItem.name)).toBeInTheDocument();
  expect(getByText(defaultContentItem.package_count + '')).toBeInTheDocument();
});
