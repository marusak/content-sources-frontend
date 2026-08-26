import axios from 'axios';
import { objectToUrlParams } from 'helpers';
import type { Links, Meta } from './types';

export type EcosystemCoverageSummary = {
  ecosystem: string;
  exact_matches: number;
  partial_matches: number;
  unmatched: number;
  total: number;
};

export type CoverageReportPackage = {
  name: string;
  version: string;
  ecosystem: string;
  covered: boolean;
  match_status: 'exact' | 'partial' | 'none';
};

export type CoverageReportPackagesListResponse = {
  data: CoverageReportPackage[];
  links: Links;
  meta: Meta;
};

export type CoverageReportPackageFilters = {
  search?: string;
  match_status?: string[];
  ecosystem?: string[];
};

type CoverageReportBase = {
  uuid: string;
  created_at: string;
  input_format?: string;
  analysis_task_uuid?: string;
};

type PendingCoverageReport = CoverageReportBase & {
  status: 'pending';
};

export type CompletedCoverageReport = CoverageReportBase & {
  status: 'completed';
  exact_matches: number;
  partial_matches: number;
  unmatched: number;
  total: number;
  ecosystem_coverage_summary: EcosystemCoverageSummary[];
  completed_at: string;
};

type FailedCoverageReport = CoverageReportBase & {
  status: 'failed';
  analysis_task_error?: string;
};

export type CoverageReportResponse =
  PendingCoverageReport | CompletedCoverageReport | FailedCoverageReport;

export const createCoverageReport = async (file: File): Promise<CoverageReportResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await axios.post<CoverageReportResponse>(
    '/api/content-sources/v1/coverage_reports/',
    formData,
  );
  return data;
};

export const getCoverageReport = async (uuid: string): Promise<CoverageReportResponse> => {
  const { data } = await axios.get<CoverageReportResponse>(
    `/api/content-sources/v1/coverage_reports/${encodeURIComponent(uuid)}`,
  );
  return data;
};

export const getCoverageReportPackages = async (
  uuid: string,
  page: number,
  limit: number,
  filters: CoverageReportPackageFilters = {},
): Promise<CoverageReportPackagesListResponse> => {
  const { data } = await axios.get<CoverageReportPackagesListResponse>(
    `/api/content-sources/v1/coverage_reports/${encodeURIComponent(uuid)}/packages?${objectToUrlParams(
      {
        offset: ((page - 1) * limit).toString(),
        limit: limit.toString(),
        search: filters.search,
        match_status: filters.match_status?.join(','),
        ecosystem: filters.ecosystem?.join(','),
      },
    )}`,
  );
  return data;
};
