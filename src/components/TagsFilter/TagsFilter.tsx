import {
  Badge,
  Bullseye,
  Button,
  Menu,
  MenuContainer,
  MenuContent,
  MenuFooter,
  MenuGroup,
  MenuItem,
  MenuList,
  MenuToggle,
  Panel,
  PanelMain,
  PanelMainBody,
  Spinner,
} from '@patternfly/react-core';
import { cellWidth, IRow } from '@patternfly/react-table';
import { TagModal } from '@redhat-cloud-services/frontend-components';
import { FunctionComponent, useRef, useState } from 'react';
import { TagItem } from 'services/Systems/SystemsApi';
import { useTagsQuery } from 'services/Systems/SystemsQueries';

interface TagsFilterProps {
  selectedTags: string[];
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
}

interface TagRow extends IRow {
  id: string;
}

const TagsFilter: FunctionComponent<TagsFilterProps> = ({ selectedTags, setSelectedTags }) => {
  const [tagsFilterOpen, setTagsFilterOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState<TagRow[]>([]);

  const { data: tagsData, isLoading } = useTagsQuery(page, perPage);

  const groupByNamespace: (tagsData: TagItem[]) => { [key: string]: TagItem[] } = (
    tagsData: TagItem[],
  ) =>
    tagsData.reduce((acc, tag) => {
      acc[tag.tag.namespace] ??= [];
      acc[tag.tag.namespace].push(tag);
      return acc;
    }, {});

  const tags = tagsData?.data;

  const groupedByNamespace = groupByNamespace(tags || []);

  const isSelected = (id: string, { key, value, namespace }) =>
    id === `${namespace}/${key}=${value}`;

  const rows: TagRow[] | undefined = tags?.map(({ tag: { key, value, namespace } }) => {
    const isSel =
      selectedRows?.some(({ id }) => isSelected(id, { key, value, namespace })) || false;

    return {
      id: `${namespace}/${key}=${value}`,
      selected: isSel,
      cells: [key, value, namespace],
      item: {
        meta: {
          tag: { key, value },
        },
      },
    };
  });

  console.log('selectedRows', selectedRows);

  return (
    <>
      <MenuContainer
        menu={
          <Menu
            ref={menuRef}
            isScrollable
            onSelect={(_event, itemId) => {
              const item = itemId as string;
              if (selectedTags.includes(item)) {
                setSelectedTags((prev) => prev.filter((id) => id !== item));
                setSelectedRows((prev) => prev.filter(({ id }) => id !== item));
              } else {
                setSelectedTags((prev) => [...prev, item]);
                const newTagRow = rows?.find(({ id }) => id === item);
                if (newTagRow) {
                  setSelectedRows((prev) => [...prev, newTagRow]);
                }
              }
            }}
          >
            <MenuContent>
              {Object.entries(groupedByNamespace).length > 0 && !isLoading ? (
                <>
                  <MenuList>
                    {Object.entries(groupedByNamespace).map(([namespace, tags]) => (
                      <MenuGroup label={namespace} key={namespace}>
                        <MenuList style={{ padding: 0 }}>
                          {tags.map((tag) => {
                            const itemKey = `${namespace}/${tag.tag.key}=${tag.tag.value}`;
                            return (
                              <MenuItem
                                hasCheckbox
                                isSelected={selectedTags.includes(itemKey)}
                                key={itemKey}
                                itemId={itemKey}
                              >
                                {tag.tag.key}={tag.tag.value}
                              </MenuItem>
                            );
                          })}
                        </MenuList>
                      </MenuGroup>
                    ))}
                  </MenuList>
                  {tagsData?.meta.total_items && tagsData.meta.total_items > 10 ? (
                    <MenuFooter>
                      <Button
                        variant='link'
                        isInline
                        onClick={() => {
                          setModalOpen(true);
                          setTagsFilterOpen(false);
                          setPerPage(20);
                        }}
                      >
                        {tagsData?.meta.total_items - 10} more tags available
                      </Button>
                    </MenuFooter>
                  ) : null}
                </>
              ) : (
                <Bullseye>
                  {isLoading ? (
                    <Spinner />
                  ) : (
                    <Panel>
                      <PanelMain>
                        <PanelMainBody>No tags available</PanelMainBody>
                      </PanelMain>
                    </Panel>
                  )}
                </Bullseye>
              )}
            </MenuContent>
          </Menu>
        }
        menuRef={menuRef}
        isOpen={tagsFilterOpen}
        toggle={
          <MenuToggle
            ref={toggleRef}
            badge={<Badge>{selectedTags.length}</Badge>}
            onClick={() => setTagsFilterOpen(!tagsFilterOpen)}
            isExpanded={tagsFilterOpen}
          >
            Selected tags
          </MenuToggle>
        }
        toggleRef={toggleRef}
      />
      <TagModal
        title={`All available tags (${tagsData?.meta.total_items})`}
        isOpen={modalOpen}
        tableProps={{
          canSelectAll: false,
        }}
        toggleModal={() => {
          setModalOpen(false);
          setPerPage(10);
        }}
        loaded={!isLoading}
        columns={[
          { title: 'Name' },
          { title: 'Value', transforms: [cellWidth(30)] },
          { title: 'Tag source', transforms: [cellWidth(30)] },
        ]}
        onUpdateData={({ page, perPage }) => {
          setPage(page);
          setPerPage(perPage);
          return undefined;
        }}
        rows={rows || ([] as IRow[])}
        pagination={{
          count: tagsData?.meta.total_items || 0,
          page: page,
          perPage: perPage,
        }}
        onSelect={(selected) => {
          setSelectedRows(selected as TagRow[]);
        }}
        selected={selectedRows}
        onApply={() => setSelectedTags(selectedRows?.map((row) => row.id))}
      />
    </>
  );
};

export default TagsFilter;
