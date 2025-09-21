import { ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import { ContentOrigin } from '../../../../services/Content/ContentApi';
import React from 'react';
import { useAppContext } from '../../../../middleware/AppContext';

interface Props {
  contentOrigin: ContentOrigin[];
  setContentOrigin: React.Dispatch<React.SetStateAction<ContentOrigin[]>>;
}

const ContentOriginFilter = ({ contentOrigin, setContentOrigin }: Props) => {
  const { features } = useAppContext();

  return features?.snapshots?.accessible ? (
    <ToggleGroup aria-label='Default with single selectable'>
      <ToggleGroupItem
        text='Custom'
        buttonId='custom-repositories-toggle-button'
        data-ouia-component-id='custom-repositories-toggle'
        isSelected={
          contentOrigin.includes(ContentOrigin.EXTERNAL) &&
          contentOrigin.includes(ContentOrigin.UPLOAD)
        }
        onChange={() => {
          setContentOrigin((prev) => {
            const custom =
              contentOrigin.includes(ContentOrigin.EXTERNAL) &&
              contentOrigin.includes(ContentOrigin.UPLOAD);
            return custom
              ? prev.filter(
                  (origin) => origin !== ContentOrigin.EXTERNAL && origin !== ContentOrigin.UPLOAD,
                )
              : [...new Set([...prev, ContentOrigin.EXTERNAL, ContentOrigin.UPLOAD])];
          });
        }}
      />
      {features?.communityrepos?.enabled ? (
        <ToggleGroupItem
          text='EPEL'
          buttonId='epel-repositories-toggle-button'
          data-ouia-component-id='epel-repositories-toggle'
          isSelected={contentOrigin.includes(ContentOrigin.COMMUNITY)}
          onChange={() => {
            setContentOrigin((prev) =>
              prev.includes(ContentOrigin.COMMUNITY)
                ? prev.filter((origin) => origin !== ContentOrigin.COMMUNITY)
                : [...prev, ContentOrigin.COMMUNITY],
            );
          }}
        />
      ) : null}
      <ToggleGroupItem
        text='Red Hat'
        buttonId='redhat-repositories-toggle-button'
        data-ouia-component-id='redhat-repositories-toggle'
        isSelected={contentOrigin.includes(ContentOrigin.REDHAT)}
        onChange={() => {
          setContentOrigin((prev) =>
            prev.includes(ContentOrigin.REDHAT)
              ? prev.filter((origin) => origin !== ContentOrigin.REDHAT)
              : [...prev, ContentOrigin.REDHAT],
          );
        }}
      />
    </ToggleGroup>
  ) : null;
};

export default ContentOriginFilter;
