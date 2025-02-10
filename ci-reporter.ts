import type {
  Reporter, FullConfig, Suite, TestCase, TestResult, FullResult
} from '@playwright/test/reporter';

class MyReporter implements Reporter {
  suite!: Suite

  onBegin(config: FullConfig, suite: Suite) {
    this.suite = suite;
  }

  onEnd(result: FullResult) {
    let passed = 0;
    let failed = 0;
    let flaky = 0;
    let skipped = 0;
    let internal_error = false;

    this.suite.suites.forEach((project) => {
        project.allTests().forEach((test) => {
            if (!test.results[0])
                return;
            if (test.results[0].status === "passed")
                passed += 1;
            else if (test.results[0].status === "skipped")
                skipped += 1;
            else if (test.retries === 0) {
                if (test.results[0].status === "failed")
                    failed += 1;
                else
                    internal_error = true;
            } else if (test.retries > 0) {
                if (test.retries + 1 === test.results.length) {
                    if (test.results[test.retries].status === "passed")
                        flaky += 1;
                    else if (test.results[test.retries].status === "failed")
                        failed += 1;
                    else
                        internal_error = true;
                } else if (test.results[test.results.length - 1].status === "passed")
                    flaky += 1;
                else
                    internal_error = true;
            }
        })
    });

    if (internal_error) {
        console.log("Failed to parse test results!")
        return;
    }

    let skipped_msg = "";
    if (skipped > 0)
        skipped_msg = `${skipped} skipped`;

    let flaky_msg = "";
    if (flaky > 0)
        flaky_msg = `${flaky} flaky`;

    let msg = ""
    if (failed > 0)
        msg = `❌ ${failed} failed test(s)`;
    else
        msg = `✅ ${passed} passed test(s)`;

    console.log([msg, flaky_msg, skipped_msg].filter(Boolean).join(", "));
  }
}
export default MyReporter;
