import { render } from '@testing-library/react';
import DeleteKebab from './DeleteKebab';
import userEvent from '@testing-library/user-event';

jest.mock('middleware/AppContext', () => ({
  useAppContext: () => ({ rbac: { read: true, write: true } }),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

it('Render no checked repos', async () => {
  const { getByRole } = render(
    <DeleteKebab atLeastOneRepoChecked={false} numberOfReposChecked={0} />,
  );

  const kebab = getByRole('button', { name: 'plain kebab' });
  await userEvent.click(kebab as Element);

  const deleteButton = getByRole('menuitem', { name: 'Delete repository' });
  expect(deleteButton).toBeInTheDocument();
  expect(deleteButton).toHaveAttribute('disabled');
});

it('Render with checked repos', async () => {
  const repos = 100;
  const { queryByText } = render(
    <DeleteKebab atLeastOneRepoChecked={true} numberOfReposChecked={repos} />,
  );

  const kebab = document.getElementById('delete-kebab');
  await userEvent.click(kebab as Element);

  const deleteButton = queryByText(`Delete ${repos} repositories`);
  expect(deleteButton).toBeInTheDocument();
  expect(deleteButton).not.toHaveAttribute('disabled');
});
