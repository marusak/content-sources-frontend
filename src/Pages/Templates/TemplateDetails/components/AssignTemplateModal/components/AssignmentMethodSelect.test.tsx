import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssignmentMethodSelect, { AssignmentMethods } from './AssignmentMethodSelect';

describe('AssignmentMethodSelect', () => {
  const mockSetSelected = jest.fn();

  it('displays currently selected option', () => {
    render(
      <AssignmentMethodSelect
        selected={AssignmentMethods.ApiAssignment}
        setSelected={mockSetSelected}
        hasRegisteredSystems={true}
      />,
    );

    expect(screen.getByRole('button', { name: 'Via API' })).toBeInTheDocument();
  });

  it('disables system list option when no registered systems are available', async () => {
    const user = userEvent.setup();

    render(
      <AssignmentMethodSelect
        selected={AssignmentMethods.ApiRegistration}
        setSelected={mockSetSelected}
        hasRegisteredSystems={false}
      />,
    );

    const dropdown = screen.getByRole('button', { name: 'Register and assign via API' });
    await user.click(dropdown);

    const menu = screen.getByRole('listbox');
    expect(within(menu).getByRole('option', { name: 'Via system list' })).toBeDisabled();
  });
});
