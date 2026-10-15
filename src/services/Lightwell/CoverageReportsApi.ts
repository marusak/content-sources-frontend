import axios from 'axios';
import { objectToUrlParams } from 'helpers';
import type { Links, Meta } from './types';

export type EcosystemCoverageSummary = {
  ecosystem: string;
  supported: boolean;
  exact_matches: number;
  partial_matches: number;
  unmatched: number;
  total: number;
};

export type CoverageMatchStatus = 'exact' | 'partial' | 'none';

// Count of CVEs fixed in remediated repos, bucketed by severity.
export type CveCount = {
  critical: number;
  important: number;
  moderate: number;
  low: number;
};

// Min/max CVSS severity scores across a package's CVEs.
export type CveRange = {
  low: number;
  high: number;
};

export type CoverageReportPackage = {
  name: string;
  version: string;
  ecosystem: string;
  covered: boolean;
  match_status: CoverageMatchStatus;
  cve_count: CveCount;
  // Omitted by the backend when the package has no CVEs.
  cve_range?: CveRange;
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
  // True when the backend stored a parser log of ignored entries.
  parse_log_available?: boolean;
};

type PendingCoverageReport = CoverageReportBase & {
  status: 'pending';
};

export type CompletedCoverageReport = CoverageReportBase & {
  status: 'completed';
  // Parser entries skipped due to invalid input; absent on older backends.
  skipped_entries?: number;
  exact_matches: number;
  partial_matches: number;
  unmatched: number;
  total: number;
  ecosystem_coverage_summary: EcosystemCoverageSummary[];
  cve_summary: CveCount;
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

export const coverageParseLogPath = (uuid: string): string =>
  `/api/content-sources/v1/coverage_reports/${encodeURIComponent(uuid)}/parse_log`;

export const downloadCoverageParseLog = async (uuid: string): Promise<void> => {
  const { data } = await axios.get<Blob>(coverageParseLogPath(uuid), { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'parser-log.txt';
  link.click();
  URL.revokeObjectURL(url);
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
        // objectToUrlParams does not escape #, so ecosystem=C# never reached the backend
        ecosystem: filters.ecosystem?.map(encodeURIComponent).join(','),
      },
    )}`,
  );
  return data;
};
