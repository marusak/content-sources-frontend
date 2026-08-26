import { useMemo } from 'react';
import LightwellPageHeader from '../components/LightwellPageHeader';
import {
  PageSection,
  Stack,
  StackItem,
  Button,
  Title,
  Truncate,
  Card,
  CardBody,
} from '@patternfly/react-core';
import ManifestUploadCard from './components/ManifestUploadCard';
import CoverageSummaryCard from './components/CoverageSummaryCard';
import EcosystemBreakdownCard from './components/EcosystemBreakdownCard';

import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import { useCoverageAnalysis } from './hooks/useCoverageAnalysis';
import { PlusIcon } from '@patternfly/react-icons';
import PackageCoverageTable from './components/PackageCoverageTable';

const CoverageAnalyzer = () => {
  const { filename, report, uploadProps, startOver } = useCoverageAnalysis();

  const ecosystems = useMemo(
    () => report?.ecosystem_coverage_summary.map((summary) => summary.ecosystem) ?? [],
    [report],
  );

  const matchAnalysisTitle =
    filename && report ? (
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
      'Lightwell Lens'
    );

  return (
    <>
      <LightwellPageHeader
        title={matchAnalysisTitle}
        ouiaId='lightwell-coverage-header'
        {...(!report && {
          description:
            'Upload your SBOM or package manifest to assess your stack against the Lightwell Network catalog.',
        })}
        {...(report && {
          actions: (
            <Button
              variant='secondary'
              icon={<PlusIcon />}
              ouiaId='lightwell-new-analysis-button'
              onClick={startOver}
            >
              New analysis
            </Button>
          ),
        })}
      />
      {/* plXs matches the mXs margin LightwellPageHeader applies to its inner title flex, keeping content left-aligned */}
      <PageSection
        aria-label='Coverage Analyzer'
        hasBodyWrapper={false}
        className={`${spacing.pt_0} ${spacing.pbLg} ${spacing.pxLg} ${spacing.plXs}`}
      >
        <Stack hasGutter style={{ maxWidth: 1200 }}>
          {report ? (
            <Stack hasGutter style={{ gap: '3rem' }}>
              <StackItem>
                <CoverageSummaryCard report={report} />
              </StackItem>
              <StackItem>
                <EcosystemBreakdownCard report={report} />
              </StackItem>
              <StackItem>
                <Card isGlass>
                  <CardBody>
                    <PackageCoverageTable uuid={report.uuid} ecosystems={ecosystems} />
                  </CardBody>
                </Card>
              </StackItem>
            </Stack>
          ) : (
            <StackItem>
              <ManifestUploadCard {...uploadProps} />
            </StackItem>
          )}
        </Stack>
      </PageSection>
    </>
  );
};

export default CoverageAnalyzer;
