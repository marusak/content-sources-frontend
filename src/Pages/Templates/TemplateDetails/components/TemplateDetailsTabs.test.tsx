import { render } from '@testing-library/react';
import TemplateDetailsTabs from './TemplateDetailsTabs';
import { defaultTemplateItem } from '../../../../testingHelpers';

const { uuid } = defaultTemplateItem;

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  useLocation: () => ({ pathname: `/templates/${uuid}/systems` }),
  useRootPath: jest.fn(),
  useParams: () => ({ templateUUID: uuid }),
}));

jest.mock('services/Templates/TemplateQueries', () => ({
  useDeleteTemplateItemMutate: () => ({ mutate: () => undefined, isLoading: false }),
}));

it('expect TemplateDetailsTabs to render all tabs, and have Systems selected', () => {
  const { queryByText } = render(<TemplateDetailsTabs />);
  expect(queryByText('Packages')).toBeInTheDocument();
  expect(queryByText('Advisories')).toBeInTheDocument();
  expect(queryByText('Systems')).toBeInTheDocument();
  expect(queryByText('Repositories'))!.toBeInTheDocument();
  expect(queryByText('Systems')!.closest('button')).toHaveAttribute('aria-selected', 'true');
});
