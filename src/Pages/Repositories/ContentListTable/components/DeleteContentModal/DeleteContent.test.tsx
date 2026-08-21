import { render } from '@testing-library/react';
import {
  ReactQueryTestWrapper,
  defaultContentItem,
  defaultTemplateItem,
  defaultTemplateItem2,
} from 'testingHelpers';
import { useContentListQuery } from 'services/Content/ContentQueries';
import DeleteContentModal from './DeleteContentModal';
import { ContentOrigin } from 'services/Content/ContentApi';
import { DELETE_ROUTE } from 'Routes/constants';
import { useTemplateList } from 'services/Templates/TemplateQueries';

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  useLocation: () => ({
    search: `${DELETE_ROUTE}?${defaultContentItem.uuid}`,
  }),
  useHref: () => 'insights/content/repositories',
}));

jest.mock('../../ContentListTable', () => ({
  useContentListOutletContext: () => ({
    clearCheckedRepositories: () => undefined,
    markAsPartner: jest.fn(),
    isMarkingPartner: false,
    deletionContext: {
      page: 1,
      perPage: 21,
      filterData: undefined,
      contentOrigin: ContentOrigin.CUSTOM,
      sortString: '',
      checkedRepositories: new Set<string>('some-uuid'),
    },
  }),
}));

jest.mock('Hooks/useRootPath', () => () => 'someUrl');

jest.mock('services/Content/ContentQueries', () => ({
  useBulkDeleteContentItemMutate: () => ({ isLoading: false }),
  useContentListQuery: jest.fn(),
}));

jest.mock('services/Templates/TemplateQueries', () => ({
  useTemplateList: jest.fn(),
}));

jest.mock('middleware/AppContext', () => ({ useAppContext: () => ({}) }));

it('Render delete modal where repo is not included in any templates', () => {
  (useContentListQuery as jest.Mock).mockImplementation(() => ({
    data: {
      isLoading: false,
      data: [defaultContentItem],
    },
  }));
  (useTemplateList as jest.Mock).mockImplementation(() => ({
    data: {
      isLoading: false,
      data: [defaultTemplateItem2],
    },
  }));

  const { queryByText } = render(
    <ReactQueryTestWrapper>
      <DeleteContentModal />
    </ReactQueryTestWrapper>,
  );

  expect(queryByText(defaultContentItem.name)).toBeInTheDocument();
  expect(queryByText(defaultContentItem.url)).toBeInTheDocument();
  expect(queryByText(defaultTemplateItem2.name)).not.toBeInTheDocument();
  expect(queryByText('None')).toBeInTheDocument();
});

it('Render delete modal where repo is included in 1 template', () => {
  (useContentListQuery as jest.Mock).mockImplementation(() => ({
    data: {
      isLoading: false,
      data: [defaultContentItem],
    },
  }));
  (useTemplateList as jest.Mock).mockImplementation(() => ({
    data: {
      isLoading: false,
      data: [defaultTemplateItem],
    },
  }));

  const { queryByText } = render(
    <ReactQueryTestWrapper>
      <DeleteContentModal />
    </ReactQueryTestWrapper>,
  );

  expect(queryByText(defaultContentItem.name)).toBeInTheDocument();
  expect(queryByText(defaultContentItem.url)).toBeInTheDocument();
  expect(queryByText(defaultTemplateItem.name)).toBeInTheDocument();
});

it('Render delete modal URL column with N/A when repo url is blank', () => {
  (useContentListQuery as jest.Mock).mockImplementation(() => ({
    data: {
      isLoading: false,
      data: [{ ...defaultContentItem, url: '' }],
    },
  }));
  (useTemplateList as jest.Mock).mockImplementation(() => ({
    data: {
      isLoading: false,
      data: [defaultTemplateItem2],
    },
  }));
  const { queryByText } = render(
    <ReactQueryTestWrapper>
      <DeleteContentModal />
    </ReactQueryTestWrapper>,
  );
  expect(queryByText(defaultContentItem.name)).toBeInTheDocument();
  expect(queryByText('N/A')).toBeInTheDocument();
});
