import { render } from '@testing-library/react';
import UploadContent from './UploadContent';
import React from 'react';
import { useFetchContent, useGetSnapshotList } from 'services/Content/ContentQueries';
import { defaultMetaItem, defaultSnapshotItem } from 'testingHelpers';

jest.mock('Hooks/useRootPath', () => () => 'someUrl');

jest.mock('services/Content/ContentQueries', () => ({
  useAddUploadsQuery: () => ({ mutateAsync: jest.fn() }),
  useFetchContent: jest.fn(),
  useGetSnapshotList: jest.fn(),
}));

(useFetchContent as jest.Mock).mockImplementation(() => ({
  data: {},
  isLoading: false,
  isSuccess: false,
}));

(useGetSnapshotList as jest.Mock).mockImplementation(() => ({
  data: {
    meta: defaultMetaItem,
    data: [defaultSnapshotItem],
  },
  isLoading: false,
  isFetching: false,
}));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  useParams: () => ({
    repoUUID: 'some-uuid',
  }),
}));

it('Render base upload modal', async () => {
  const realUseState = React.useState;

  jest
    .spyOn(React, 'useState')
    .mockImplementationOnce(() =>
      realUseState([{ sha256: 'string', uuid: 'string', href: 'string' }] as unknown),
    )
    .mockImplementationOnce(() => realUseState(false as unknown))
    .mockImplementationOnce(() => realUseState(true as unknown));

  const { queryByText } = render(<UploadContent />);

  expect(
    queryByText('Use the form below to upload content to your repository.'),
  ).toBeInTheDocument();

  expect(
    queryByText('Are you sure you want to quit without saving these changes?'),
  ).toBeInTheDocument();
});
