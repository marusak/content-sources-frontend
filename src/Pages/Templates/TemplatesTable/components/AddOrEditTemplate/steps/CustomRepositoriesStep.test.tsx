import { render } from '@testing-library/react';
import { useAddTemplateContext } from '../AddTemplateContext';
import { defaultContentItem, defaultTemplateItem } from 'testingHelpers';
import { useContentListQuery } from 'services/Content/ContentQueries';
import CustomRepositoriesStep from './CustomRepositoriesStep';

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

it('expect CustomRepositoriesStep to render correctly', () => {
  (useContentListQuery as jest.Mock).mockImplementation(() => ({
    data: {
      data: [defaultContentItem],
      meta: { limit: 10, offset: 0, count: 1 },
      isLoading: false,
    },
  }));

  (useAddTemplateContext as jest.Mock).mockImplementation(() => ({
    isEdit: false,
    templateRequest: defaultTemplateItem,
    setSelectedCustomRepos: () => undefined,
    selectedCustomRepos: new Set([defaultTemplateItem.uuid]),
    queryClient: { invalidateQueries: () => {} },
  }));

  const { getByRole, getByText } = render(<CustomRepositoriesStep />);

  const firstCheckboxInList = getByRole('checkbox', { name: 'Select row 0' });

  expect(firstCheckboxInList).toBeInTheDocument();
  expect(firstCheckboxInList).toBeDisabled();

  expect(getByText(defaultContentItem.name)).toBeInTheDocument();
  expect(getByText(defaultContentItem.package_count + '')).toBeInTheDocument();
});
