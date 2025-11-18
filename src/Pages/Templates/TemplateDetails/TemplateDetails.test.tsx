import { render } from '@testing-library/react';
import TemplateDetails from './TemplateDetails';
import { defaultTemplateItem } from 'testingHelpers';

jest.mock('services/Templates/TemplateQueries', () => ({
  useFetchTemplate: () => ({ data: defaultTemplateItem, isError: false, isLoading: false }),
}));
jest.mock('./components/TemplateDetailsTabs', () => () => 'TemplateDetailsTabs');
jest.mock('./components/TemplateActionDropdown', () => () => 'TemplateActionDropdown');

jest.mock('Hooks/useRootPath', () => () => 'banana');

const { uuid } = defaultTemplateItem;

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  useParams: () => ({ templateUUID: uuid }),
  Outlet: () => <></>,
  useLocation: () => ({
    pathname: `/templates/${uuid}/systems`,
  }),
}));

jest.mock('Hooks/useArchVersion', () => () => ({
  isError: false,
  isLoading: false,
  archesDisplay: () => 'x86_64',
  versionDisplay: () => 'Rhel9',
}));

it('expect TemplateDetails to render correctly', () => {
  const { queryByText, queryAllByText } = render(<TemplateDetails />);

  expect(queryByText('TemplateDetailsTabs')).toBeInTheDocument();
  expect(queryByText('x86_64')).toBeInTheDocument();
  expect(queryByText('Rhel9')).toBeInTheDocument();
  expect(queryAllByText(defaultTemplateItem.name)).toHaveLength(2);
});
