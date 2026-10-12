import { useRef, useState } from 'react';
import {
  Button,
  Content,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import type { PDFRequestPayload } from '@redhat-cloud-services/types';

import {
  getCoverageReportPackages,
  type CoverageReportPackage,
  type CoverageReportPackageFilters,
} from 'services/Lightwell/CoverageReportsApi';

import {
  buildCoveragePdfPayload,
  COVERAGE_PDF_MAX_PAGES,
  coveragePdfPageCount,
} from '../pdf/coveragePdf';
import { fetchAllPages } from '../../utils/exportUtils';
import { ExportMenu as ExportMenuBase } from '../../components/ExportMenu';

type ExportMenuProps = {
  uuid?: string;
  filename?: string;
  filters?: CoverageReportPackageFilters;
  // When false, CVE columns are empty across the report, so they are stripped
  // from the CSV/JSON rows and omitted from the PDF.
  includeCveData?: boolean;
  // Filtered package total already loaded for the table. When omitted, the PDF
  // action reads the total with a single metadata request.
  packageCount?: number;
};

type PdfSizeDecision = 'overview' | 'close';

export function fetchAllCoveragePackages(
  uuid: string,
  filters?: CoverageReportPackageFilters,
): Promise<CoverageReportPackage[]> {
  return fetchAllPages((pageSize, pageIndex) =>
    getCoverageReportPackages(uuid, pageIndex + 1, pageSize, filters).then(({ data }) => data),
  );
}

// Drop the CVE fields so empty data is not exported; see includeCveData.
function stripCveData(
  pkg: CoverageReportPackage,
): Omit<CoverageReportPackage, 'cve_count' | 'cve_range'> {
  const rest: Partial<CoverageReportPackage> = { ...pkg };
  delete rest.cve_count;
  delete rest.cve_range;
  return rest as Omit<CoverageReportPackage, 'cve_count' | 'cve_range'>;
}

export function ExportMenu({
  uuid,
  filename,
  filters,
  includeCveData = true,
  packageCount,
}: ExportMenuProps) {
  const [oversizedPageCount, setOversizedPageCount] = useState<number | null>(null);
  const decisionRef = useRef<((decision: PdfSizeDecision) => void) | null>(null);
  const overviewOnlyRef = useRef(false);

  const settleDecision = (decision: PdfSizeDecision) => {
    const resolve = decisionRef.current;
    decisionRef.current = null;
    setOversizedPageCount(null);
    resolve?.(decision);
  };

  const beforePdfExport = async () => {
    overviewOnlyRef.current = false;
    const count =
      packageCount ?? (await getCoverageReportPackages(uuid!, 1, 1, filters)).meta.count;
    const pages = coveragePdfPageCount(count);
    if (pages <= COVERAGE_PDF_MAX_PAGES) {
      return true;
    }

    const decision = await new Promise<PdfSizeDecision>((resolve) => {
      decisionRef.current = resolve;
      setOversizedPageCount(pages);
    });
    if (decision === 'overview') {
      overviewOnlyRef.current = true;
      return true;
    }
    return false;
  };

  return (
    <>
      <ExportMenuBase
        isReady={Boolean(uuid)}
        ouiaId='lightwell-coverage-export-toggle'
        csvFilename={`lightwell-match-analysis-${uuid}.csv`}
        jsonFilename={`lightwell-match-analysis-${uuid}.json`}
        fetchRows={async () => {
          const packages = await fetchAllCoveragePackages(uuid!, filters);
          return includeCveData ? packages : packages.map(stripCveData);
        }}
        beforePdfExport={beforePdfExport}
        buildPdfRequest={async () => ({
          filename: `lightwell-match-analysis-${uuid}.pdf`,
          payload: buildCoveragePdfPayload({
            uuid: uuid!,
            filename,
            filters,
            includeCveData,
            includePackages: !overviewOnlyRef.current,
          }) as unknown as PDFRequestPayload,
        })}
        errorNotification={{
          title: 'Error exporting report',
          message: 'Unable to export the match analysis report',
          id: 'coverage-export-error',
        }}
      />
      <Modal
        variant={ModalVariant.medium}
        position='top'
        isOpen={oversizedPageCount !== null}
        onClose={() => settleDecision('close')}
        aria-labelledby='lightwell-coverage-pdf-too-large-title'
        ouiaId='lightwell-coverage-pdf-too-large'
      >
        <ModalHeader
          title='The exported PDF is going to be too large'
          labelId='lightwell-coverage-pdf-too-large-title'
        />
        <ModalBody>
          {oversizedPageCount !== null ? (
            <Content component='p'>
              The exported PDF is going to be {oversizedPageCount} pages long. We do not support
              exporting PDF larger than {COVERAGE_PDF_MAX_PAGES} pages. Either use filters to limit
              the list of packages or export only the overview. You can export CSV and JSON when
              needing all the details.
            </Content>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button
            variant='primary'
            ouiaId='lightwell-coverage-pdf-export-overview'
            onClick={() => settleDecision('overview')}
          >
            Export only the overview
          </Button>
          <Button
            variant='secondary'
            ouiaId='lightwell-coverage-pdf-too-large-close'
            onClick={() => settleDecision('close')}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
