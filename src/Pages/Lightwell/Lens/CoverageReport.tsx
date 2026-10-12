import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRemoteHook } from '@scalprum/react-core';
import { useFlag } from '@unleash/proxy-client-react';
import LightwellPageHeader from '../components/LightwellPageHeader';
import {
  Button,
  Card,
  CardBody,
  Flex,
  FlexItem,
  PageSection,
  Stack,
  StackItem,
  Title,
  Truncate,
} from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import CoverageSummaryBlock from './components/CoverageSummaryBlock';
import CveFixesBlock from './components/CveFixesBlock';
import EcosystemBreakdownBlock from './components/EcosystemBreakdownBlock';
import PackageCoverageTable from './components/PackageCoverageTable';
import { ExportMenu } from './components/ExportMenu';
import RemediatedDataWarning from '../RemediatedDataWarning';
import { useCoverageReport } from './hooks/useCoverageReport';
import { usePackageCoverageTable } from './hooks/usePackageCoverageTable';
import Loader from 'components/Loader';
import LightwellNotFound from '../components/LightwellNotFound';
import type { EcosystemInfo } from './utils/ecosystem';
import { getTotalCveCount } from './utils/cveSeverity';
import { useLightwellRootPath } from '../../../Hooks/Lightwell/navigation/useLightwellRootPath';

const DROP_LAST_CHROME_SEGMENT_OPTIONS = { dropLastChromeSegment: true };

const CoverageReport = () => {
  const { reportUUID } = useParams();
  const { filename, report, isLoading, isError, error, startOver } = useCoverageReport(reportUUID);
  const rootPath = useLightwellRootPath();
  const appBreadcrumbsEnabled = useFlag('platform.chrome.app-breadcrumbs');
  const breadcrumbs = useMemo(
    () => [{ pathname: `${rootPath}/lens`, title: 'Lightwell Lens' }],
    [rootPath],
  );

  useRemoteHook({
    scope: 'chrome',
    module: './breadcrumbs/useReplaceBreadcrumbs',
    args: appBreadcrumbsEnabled ? [breadcrumbs, DROP_LAST_CHROME_SEGMENT_OPTIONS] : [[]],
  });

  const ecosystems: EcosystemInfo[] = useMemo(
    () =>
      report?.ecosystem_coverage_summary.map(({ ecosystem, supported }) => ({
        name: ecosystem,
        supported,
      })) ?? [],
    [report],
  );

  // Lifted so the export reuses whatever filters the table currently has applied.
  const table = usePackageCoverageTable(ecosystems);
  const [packageCount, setPackageCount] = useState<number | undefined>();

  if (isLoading) return <Loader />;
  if (isError) throw error;
  if (!report) return <LightwellNotFound />;

  // Drives every CVE surface (summary card, table columns, exports): when the
  // net-delta totals are all zero no package has CVE data worth showing.
  const hasCveData = getTotalCveCount(report.cve_summary) > 0;

  const matchAnalysisTitle = filename ? (
    <Title headingLevel='h1'>
      Match analysis for manifest{' '}
      <strong>
        <span
          style={{
            display: 'inline-block',
            maxWidth: '24rem',
            verticalAlign: 'bottom',
          }}
        >
          <Truncate content={filename} position='middle' />
        </span>
      </strong>
    </Title>
  ) : (
    'Match analysis'
  );

  return (
    <>
      <LightwellPageHeader
        title={matchAnalysisTitle}
        ouiaId='lightwell-coverage-header'
        actions={
          <Flex gap={{ default: 'gapSm' }}>
            <FlexItem>
              <ExportMenu
                uuid={report.uuid}
                filename={filename}
                filters={table.debouncedFilters}
                includeCveData={hasCveData}
                packageCount={packageCount}
              />
            </FlexItem>
            <FlexItem>
              <Button
                variant='secondary'
                icon={<PlusIcon />}
                ouiaId='lightwell-new-analysis-button'
                onClick={startOver}
              >
                New analysis
              </Button>
            </FlexItem>
          </Flex>
        }
      />
      {/* plXs matches the mXs margin LightwellPageHeader applies to its inner title flex, keeping content left-aligned */}
      <PageSection
        aria-label='Match analysis'
        hasBodyWrapper={false}
        className={`${spacing.pt_0} ${spacing.pbLg} ${spacing.pxLg} ${spacing.plXs}`}
      >
        <Stack hasGutter style={{ maxWidth: 1200, gap: '3rem' }}>
          <StackItem>
            <CoverageSummaryBlock report={report} />
          </StackItem>
          {hasCveData && (
            <StackItem>
              <CveFixesBlock report={report} />
            </StackItem>
          )}
          <StackItem>
            <EcosystemBreakdownBlock report={report} />
          </StackItem>
          <StackItem>
            <Card isGlass>
              <CardBody>
                {/* Remove Flex because it interacts with DataView's 100%-height and creates extra space below pagination */}
                <RemediatedDataWarning className={spacing.mbMd} />
                <PackageCoverageTable
                  uuid={report.uuid}
                  ecosystems={ecosystems}
                  table={table}
                  showCveColumns={hasCveData}
                  onPackageCountChange={setPackageCount}
                />
              </CardBody>
            </Card>
          </StackItem>
        </Stack>
      </PageSection>
    </>
  );
};

export default CoverageReport;
