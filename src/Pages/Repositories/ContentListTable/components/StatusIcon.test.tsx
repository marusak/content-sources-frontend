import { render, waitFor } from '@testing-library/react';
import StatusIcon from './StatusIcon';
import { defaultContentItem, defaultContentItem_Upload } from 'testingHelpers';

jest.mock('middleware/AppContext', () => ({
  useAppContext: () => ({ rbac: { read: true, write: true } }),
}));

it('Render with Pending status', () => {
  const { queryByText } = render(
    <StatusIcon rowData={{ ...defaultContentItem, status: 'Pending' }} />,
  );

  const SelectComponent = queryByText('In progress');
  expect(SelectComponent).toBeInTheDocument();
});

it('Render with Valid status', () => {
  const { queryByText } = render(
    <StatusIcon rowData={{ ...defaultContentItem, status: 'Valid' }} />,
  );
  const SelectComponent = queryByText('Valid');
  expect(SelectComponent).toBeInTheDocument();
});

it('Render with Unavailable status', async () => {
  const { queryByText } = render(
    <StatusIcon rowData={{ ...defaultContentItem, status: 'Unavailable' }} />,
  );
  const SelectComponent = queryByText('Unavailable');
  expect(SelectComponent).toBeInTheDocument();

  await waitFor(() => {
    SelectComponent?.click();
  });

  await waitFor(() => {
    expect(queryByText('Retry')).toBeInTheDocument();
    expect(queryByText('A snapshot error occurred: snapshot failed')).toBeInTheDocument();
    expect(queryByText('Last introspection')).toBeInTheDocument();
    expect(queryByText('Failed attempts')).toBeInTheDocument();
  });
});

it('Render with Invalid status', async () => {
  const { queryByText } = render(
    <StatusIcon rowData={{ ...defaultContentItem, status: 'Invalid' }} />,
  );
  const SelectComponent = queryByText('Invalid');
  expect(SelectComponent).toBeInTheDocument();

  await waitFor(() => {
    SelectComponent?.click();
  });

  await waitFor(() => {
    expect(queryByText('Retry')).toBeInTheDocument();
    expect(queryByText('A snapshot error occurred: snapshot failed')).toBeInTheDocument();
    expect(queryByText('Last introspection')).toBeInTheDocument();
    expect(queryByText('Failed attempts')).toBeInTheDocument();
  });
});

it('Render upload repo with Unavailable status', async () => {
  const { queryByText } = render(
    <StatusIcon rowData={{ ...defaultContentItem_Upload, status: 'Unavailable' }} />,
  );
  const SelectComponent = queryByText('Unavailable');
  expect(SelectComponent).toBeInTheDocument();

  await waitFor(() => {
    SelectComponent?.click();
  });

  await waitFor(() => {
    expect(queryByText('Retry')).not.toBeInTheDocument();
    expect(queryByText('A snapshot error occurred: snapshot failed')).toBeInTheDocument();
    expect(queryByText('Last introspection')).not.toBeInTheDocument();
    expect(queryByText('Failed attempts')).not.toBeInTheDocument();
  });
});

it('Render upload repo with Invalid status', async () => {
  const { queryByText } = render(
    <StatusIcon rowData={{ ...defaultContentItem_Upload, status: 'Invalid' }} />,
  );
  const SelectComponent = queryByText('Invalid');
  expect(SelectComponent).toBeInTheDocument();

  await waitFor(() => {
    SelectComponent?.click();
  });

  await waitFor(() => {
    expect(queryByText('Retry')).not.toBeInTheDocument();
    expect(queryByText('A snapshot error occurred: snapshot failed')).toBeInTheDocument();
    expect(queryByText('Last introspection')).not.toBeInTheDocument();
    expect(queryByText('Failed attempts')).not.toBeInTheDocument();
  });
});
