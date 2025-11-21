import { render } from '@testing-library/react';
import TemplateDetailsTabs from './TemplateDetailsTabs';
import { defaultTemplateItem } from '../../../../testingHelpers';
import { TEMPLATES_ROUTE, SYSTEMS_ROUTE } from '../../../../Routes/constants';

const { uuid } = defaultTemplateItem;

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  useLocation: () => ({ pathname: `/${TEMPLATES_ROUTE}/${uuid}/${SYSTEMS_ROUTE}` }),
}));

jest.mock('Hooks/useRootPath', () => () => 'insights/content');

jest.mock('Hooks/useSafeUUIDParam', () => () => uuid);

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
