import { Content, PageSection } from '@patternfly/react-core';

import LightwellPageHeader from '../components/LightwellPageHeader';

const Lens = () => (
  <>
    <LightwellPageHeader
      title='Lens'
      ouiaId='lightwell-lens-header'
      description='See how much of your software supply chain Lightwell covers.'
    />
    <PageSection hasBodyWrapper={false} data-ouia-component-id='lightwell-lens-page'>
      <Content component='p'>Lens content coming soon.</Content>
    </PageSection>
  </>
);

export default Lens;
