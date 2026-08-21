import { fireEvent, render, waitFor } from '@testing-library/react';
import {
  defaultValidationErrorData,
  passingValidationErrorData,
  ReactQueryTestWrapper,
} from 'testingHelpers';
import AddContent from './AddContent';
import {
  useAddContentQuery,
  useBulkDeleteContentItemMutate,
  useEditContentQuery,
  useFetchContent,
  useFetchGpgKey,
  useValidateContentList,
} from 'services/Content/ContentQueries';

jest.mock('services/Content/ContentQueries', () => ({
  useAddContentQuery: jest.fn(),
  useFetchContent: jest.fn(),
  useEditContentQuery: jest.fn(),
  useValidateContentList: jest.fn(),
  useFetchGpgKey: jest.fn(),
  useBulkDeleteContentItemMutate: jest.fn(),
}));

(useFetchGpgKey as jest.Mock).mockImplementation(() => ({
  isLoading: false,
  fetchGpgKey: () => '',
}));

(useAddContentQuery as jest.Mock).mockImplementation(() => ({
  isLoading: false,
  mutateAsync: async () => null,
}));

(useBulkDeleteContentItemMutate as jest.Mock).mockImplementation(() => ({
  isLoading: false,
  mutateAsync: async () => null,
}));

jest.mock('middleware/AppContext', () => ({
  useAppContext: () => ({ rbac: { read: true, write: true } }),
}));

jest.mock('Hooks/useRootPath', () => () => 'someUrl');

jest.mock('Hooks/useNotification', () => () => ({ notify: () => null }));

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useOutletContext: () => () => null, // returns mock clearCheckedRepositories function
  useLocation: () => ({
    search: '',
  }),
  useParams: () => 'banana',
}));

jest.mock('../../ContentListTable', () => ({
  useContentListOutletContext: () => ({
    clearCheckedRepositories: () => undefined,
    markAsPartner: jest.fn(),
    isMarkingPartner: false,
  }),
}));

jest.mock('@redhat-cloud-services/frontend-components/useChrome', () => () => ({
  isProd: () => false,
  isBeta: () => false,
}));

const passingValidationMetaDataSigNotPresent = [
  {
    ...passingValidationErrorData[0],
    url: { ...passingValidationErrorData[0], metadata_signature_present: false },
  },
];

(useFetchContent as jest.Mock).mockImplementation(() => ({
  data: {},
  isLoading: false,
  isSuccess: false,
}));

(useEditContentQuery as jest.Mock).mockImplementation(() => ({
  isLoading: false,
  mutateAsync: async () => {},
}));

it('expect "name" input to show a validation error', async () => {
  (useValidateContentList as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    mutateAsync: async () => defaultValidationErrorData,
  }));

  const { queryByText, queryByPlaceholderText } = render(
    <ReactQueryTestWrapper>
      <AddContent />
    </ReactQueryTestWrapper>,
  );

  const nameInput = queryByPlaceholderText('Enter name');
  expect(nameInput).toBeInTheDocument();
  if (nameInput) {
    await waitFor(() => {
      fireEvent.change(nameInput, { target: { value: 'b' } });
    });
  }
  await waitFor(() => {
    expect(queryByText('Too Short!')).toBeInTheDocument();
  });
});

it('expect "url" input to show a validation error', async () => {
  (useValidateContentList as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    mutateAsync: async () => defaultValidationErrorData,
  }));

  const { queryByText, queryByPlaceholderText } = render(
    <ReactQueryTestWrapper>
      <AddContent />
    </ReactQueryTestWrapper>,
  );

  const urlInput = queryByPlaceholderText('https://');
  expect(urlInput).toBeInTheDocument();

  if (urlInput) {
    await waitFor(() => {
      fireEvent.change(urlInput, { target: { value: 'bobTheBuilder' } });
    });
  }

  await waitFor(() => {
    expect(queryByText('Invalid URL')).toBeInTheDocument();
  });
});

it('expect "Package and metadata verification" to be pre-selected', async () => {
  (useValidateContentList as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    mutateAsync: async () => passingValidationErrorData,
    data: passingValidationErrorData,
  }));

  const { queryByText, queryByPlaceholderText, queryByLabelText } = render(
    <ReactQueryTestWrapper>
      <AddContent />
    </ReactQueryTestWrapper>,
  );

  const urlInput = queryByPlaceholderText('https://');
  expect(urlInput).toBeInTheDocument();
  await waitFor(() => {
    fireEvent.change(urlInput as HTMLElement, { target: { value: 'https://bobTheBuilder.com' } });
  });

  await waitFor(() => {
    expect(queryByText('Invalid URL')).not.toBeInTheDocument();
  });

  const gpgKeyInput = queryByPlaceholderText('Paste GPG key or URL here');
  expect(gpgKeyInput).toBeInTheDocument();

  await waitFor(() => {
    fireEvent.change(gpgKeyInput as HTMLElement, { target: { value: 'aRealGPGKey' } });
  });

  await waitFor(() => {
    expect(queryByLabelText('Package and metadata verification')).toHaveAttribute('checked');
  });
});

it('expect "Package verification only" to be pre-selected', async () => {
  (useValidateContentList as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    mutateAsync: async () => passingValidationMetaDataSigNotPresent,
    data: passingValidationMetaDataSigNotPresent,
  }));

  const { queryByText, queryByPlaceholderText, queryByLabelText } = render(
    <ReactQueryTestWrapper>
      <AddContent />
    </ReactQueryTestWrapper>,
  );

  const urlInput = queryByPlaceholderText('https://');
  expect(urlInput).toBeInTheDocument();

  await waitFor(() => {
    fireEvent.change(urlInput as HTMLElement, { target: { value: 'https://bobTheBuilder.com' } });
  });
  expect(queryByText('Invalid URL')).not.toBeInTheDocument();
  const gpgKeyInput = queryByPlaceholderText('Paste GPG key or URL here');
  expect(gpgKeyInput).toBeInTheDocument();

  await waitFor(() => {
    fireEvent.change(gpgKeyInput as HTMLElement, { target: { value: 'aRealGPGKey' } });
  });

  await waitFor(() => {
    expect(queryByText('Package verification only')).toBeInTheDocument();
    expect(queryByLabelText('Package verification only')).toHaveAttribute('checked');
  });
});

it('Add content', async () => {
  (useValidateContentList as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    mutateAsync: async () => passingValidationErrorData,
    data: passingValidationErrorData,
  }));

  const { queryByText, queryByPlaceholderText, queryByRole } = render(
    <ReactQueryTestWrapper>
      <AddContent />
    </ReactQueryTestWrapper>,
  );

  const snapshotRadio = queryByRole('radio', { name: 'Snapshotting' });
  expect(snapshotRadio).toBeInTheDocument();
  fireEvent.click(snapshotRadio!);

  const nameInput = queryByPlaceholderText('Enter name');
  expect(nameInput).toBeInTheDocument();
  const urlInput = queryByPlaceholderText('https://');
  expect(urlInput).toBeInTheDocument();
  const gpgKeyInput = queryByPlaceholderText('Paste GPG key or URL here');
  if (urlInput && nameInput && gpgKeyInput) {
    fireEvent.change(nameInput, { target: { value: 'superCoolName' } });
    fireEvent.change(urlInput, { target: { value: 'https://google.com/' } });
    fireEvent.change(gpgKeyInput, { target: { value: 'test GPG key' } });

    await waitFor(() => {
      expect(nameInput).toHaveAttribute('value', 'superCoolName');
    });

    await waitFor(() => {
      expect(urlInput?.getAttribute('value')).toBe('https://google.com/');
    });

    await waitFor(() => {
      expect(gpgKeyInput).toHaveValue('test GPG key');
    });
  }

  await waitFor(() => {
    expect(queryByText('Use GPG key for')).toBeInTheDocument();
    expect(queryByText('test GPG key')).toBeInTheDocument();
  });

  expect(queryByText('Invalid URL')).not.toBeInTheDocument();

  const saveButton = queryByText('Save');

  await waitFor(() => {
    expect(saveButton?.getAttribute('disabled')).toBeNull();
  });
  if (saveButton) {
    fireEvent.click(saveButton);
  }
  await waitFor(() => {
    expect(queryByText('Add custom repository')).not.toBeInTheDocument();
  });
});
