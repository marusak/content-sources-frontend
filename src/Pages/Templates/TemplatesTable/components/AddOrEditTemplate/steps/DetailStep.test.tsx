import { render } from '@testing-library/react';
import { useAddTemplateContext } from '../AddTemplateContext';
import { defaultTemplateItem } from 'testingHelpers';
import DetailStep from './DetailStep';

jest.mock('../AddTemplateContext', () => ({
  useAddTemplateContext: jest.fn(),
}));

it('expect DetailStep to render correctly', () => {
  (useAddTemplateContext as jest.Mock).mockImplementation(() => ({
    templateRequest: defaultTemplateItem,
    setTemplateRequest: () => undefined,
  }));

  const { getByPlaceholderText } = render(<DetailStep />);

  expect(getByPlaceholderText('Enter name')).toHaveAttribute('value', defaultTemplateItem.name);
  expect(getByPlaceholderText('Enter description')).toHaveTextContent(
    defaultTemplateItem.description,
  );
});
