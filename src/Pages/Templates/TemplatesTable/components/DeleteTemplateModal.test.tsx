import { render } from '@testing-library/react';
import { ReactQueryTestWrapper, defaultSystemsListItem, defaultTemplateItem } from 'testingHelpers';

import DeleteTemplateModal from './DeleteTemplateModal';
import { useListSystemsByTemplateId } from 'services/Systems/SystemsQueries';
import { useFetchTemplate } from 'services/Templates/TemplateQueries';
import { DETAILS_ROUTE } from 'Routes/constants';

jest.mock('react-query', () => ({
  ...jest.requireActual('react-query'),
  useQueryClient: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useParams: () => ({
    templateUUID: `${defaultTemplateItem.uuid}`,
  }),
  useNavigate: () => jest.fn,
  useLocation: () => ({
    pathname: `/mocked/${DETAILS_ROUTE}`,
  }),
}));

jest.mock('Hooks/useRootPath', () => () => 'someUrl');

jest.mock('services/Systems/SystemsQueries', () => ({
  useListSystemsByTemplateId: jest.fn(),
}));

jest.mock('services/Templates/TemplateQueries', () => ({
  useDeleteTemplateItemMutate: () => ({ mutate: () => undefined, isLoading: false }),
  useFetchTemplate: jest.fn(),
}));

jest.mock('middleware/AppContext', () => ({ useAppContext: () => ({}) }));

it('Render delete modal where there are no systems', () => {
  (useListSystemsByTemplateId as jest.Mock).mockImplementation(() => ({
    data: {
      isLoading: false,
      data: [],
      count: 0,
    },
  }));
  (useFetchTemplate as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    data: { name: 'test' },
  }));

  const { queryByText } = render(
    <ReactQueryTestWrapper>
      <DeleteTemplateModal />
    </ReactQueryTestWrapper>,
  );

  expect(queryByText('This template is in use.')).toBeNull();
  expect(
    queryByText('Template and all its data will be deleted. This action cannot be undone.'),
  ).toBeInTheDocument();
  expect(queryByText('test')).toBeInTheDocument();
});

it('Render delete modal where template has one system', () => {
  (useListSystemsByTemplateId as jest.Mock).mockImplementation(() => ({
    data: {
      isLoading: false,
      data: [defaultSystemsListItem],
      count: 1,
    },
  }));

  const { queryByText } = render(
    <ReactQueryTestWrapper>
      <DeleteTemplateModal />
    </ReactQueryTestWrapper>,
  );

  expect(queryByText('This template is in use.')).toBeInTheDocument();
  expect(
    queryByText('Template and all its data will be deleted. This action cannot be undone.'),
  ).toBeInTheDocument();
  expect(queryByText('test')).toBeInTheDocument();
});
