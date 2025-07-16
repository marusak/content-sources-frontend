import axios from 'axios';
import { objectToUrlParams } from 'helpers';
import type { Links } from 'services/Content/ContentApi';

export interface SystemAttributes {
  display_name: string;
  arch: string;
  os: string;
  rhsm: string;
  tags: string[];
  last_evaluation: string | null;
  rhsa_count: number;
  rhba_count: number;
  rhea_count: number;
  other_count: number;
  packages_installed: number;
  baseline_name: string;
  last_upload: string;
  stale_timestamp: string;
  stale_warning_timestamp: string;
  culled_timestamp: string;
  created: string;
  stale: boolean;
  satellite_managed: boolean;
  built_pkgcache: boolean;
  packages_installable: number;
  packages_applicable: number;
  installable_rhsa_count: number;
  installable_rhba_count: number;
  installable_rhea_count: number;
  installable_other_count: number;
  applicable_rhsa_count: number;
  applicable_rhba_count: number;
  applicable_rhea_count: number;
  applicable_other_count: number;
  baseline_id: number;
  template_name: string;
  template_uuid: string;
  groups: string[];
}

export interface SystemItem {
  attributes: SystemAttributes;
  id: string;
  type: string;
}

export interface SystemGroup {
  id: string;
  name: string;
}

export interface IDSystemAttributes {
  display_name: string;
  os: string;
  rhsm: string;
  installable_rhsa_count: number;
  installable_rhba_count: number;
  installable_rhea_count: number;
  installable_other_count: number;
  applicable_rhsa_count: number;
  applicable_rhba_count: number;
  applicable_rhea_count: number;
  applicable_other_count: number;
  tags: string[];
  groups: SystemGroup[];
  last_upload: string;
}

export interface IDSystemItem {
  attributes: IDSystemAttributes;
  inventory_id: string;
  type: string;
}

export type SystemMeta = {
  limit: number;
  offset: number;
  has_systems: boolean;
  subtotals: { patched: number; stale: number; unpatched: number };
  total_items: number;
};

export interface SystemsCollectionResponse {
  data: Array<SystemItem>;
  links: Links;
  meta: SystemMeta;
}

export interface IDSystemsCollectionResponse {
  data: Array<IDSystemItem>;
  links: Links;
  meta: SystemMeta;
}

export interface SystemsFilters {
  os?: string;
  stale?: string;
  arch?: string;
  ids?: string[];
  tags?: string[];
}

export interface Tag {
  namespace: string;
  key: string;
  value: string;
}

export interface TagItem {
  count: number;
  tag: Tag;
}

export interface TagsResponse {
  data: Array<TagItem>;
  links: Links;
  meta: SystemMeta;
}

const patchApiVersionUrl = '/api/patch/v3';

export const getSystemsList: (
  page: number,
  limit: number,
  search: string,
  filter: SystemsFilters,
  sortBy?: string,
) => Promise<SystemsCollectionResponse> = async (page, limit, search, filter, sortBy) => {
  const { data } = await axios.get(
    `${patchApiVersionUrl}/systems?${objectToUrlParams({
      page: page.toString(),
      limit: limit?.toString(),
      offset: ((page - 1) * limit).toString(),
      sort: sortBy,
      search,
      tags: filter.tags?.map((tag) => encodeURIComponent(tag)) || '',
      [encodeURI('filter[id]')]: filter.ids ? encodeURI(`in:${filter.ids.join(',')}`) : '',
      [encodeURI('filter[stale]')]: filter.stale
        ? encodeURI(`in:${filter.stale}`)
        : encodeURI('in:true,false'),
      [encodeURI('filter[osname]')]: 'RHEL', // Hardcoded for now
      [encodeURI('filter[osmajor]')]: filter.os,
      [encodeURI('filter[arch]')]: filter?.arch,
    })}`,
    {},
  );
  return data;
};

export const listSystemsByTemplateId: (
  id: string,
  page: number,
  limit: number,
  search: string,
  sortBy?: string,
) => Promise<IDSystemsCollectionResponse> = async (id, page, limit, search, sortBy) => {
  const { data } = await axios.get(
    `${patchApiVersionUrl}/templates/${id}/systems?${objectToUrlParams({
      offset: ((page - 1) * limit).toString(),
      limit: limit?.toString(),
      search,
      sort: sortBy,
    })}`,
  );
  return data;
};

export const listSystemsIDsByTemplateId: (
  id: string,
) => Promise<SystemsCollectionResponse> = async (id) => {
  const { data } = await axios.get(`${patchApiVersionUrl}/ids/templates/${id}/systems`);
  return data;
};

export const addTemplateToSystems: (
  templateId: string,
  systemUUIDs: string[],
) => Promise<SystemsCollectionResponse> = async (templateId, systemUUIDs) => {
  const { data } = await axios.put(`${patchApiVersionUrl}/templates/${templateId}/systems`, {
    systems: systemUUIDs,
  });
  return data;
};

export const deleteTemplateFromSystems: (systemUUIDs: string[]) => Promise<void> = async (
  systemUUIDs,
) => {
  const { data } = await axios.delete(`${patchApiVersionUrl}/templates/systems`, {
    data: { systems: systemUUIDs },
  });

  return data;
};

export const listTags: (
  page: number,
  limit: number,
  search?: string,
) => Promise<TagsResponse> = async (page: number = 1, limit: number = 10, search?: string) => {
  const { data } = await axios.get(
    `${patchApiVersionUrl}/tags?${objectToUrlParams({
      offset: ((page - 1) * limit).toString(),
      limit: limit?.toString(),
      search,
    })}`,
  );

  return data;
};
