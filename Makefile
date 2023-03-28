.DELETE_ON_ERROR:
.PHONY: all build clean lint lint-fix qa test

CATALYST_SCRIPTS:=npx catalyst-scripts

DIST=dist
ORGS_MODEL_SRC:=js
ORGS_MODEL:=$(DIST)/orgs-model.js

ORGS_MODEL_FILES:=$(shell find $(ORGS_MODEL_SRC) -type f -not -path "*/test/*")
ALL_SRC_FILES:=$(shell find $(ORGS_MODEL_SRC) -name "*.js" -o -name "*.mjs")
ALL_SRC_BUILT_FILES:=$(patsubst $(ORGS_MODEL_SRC)/%, $(TEST_STAGING)/%, $(ALL_SRC_FILES))


BUILD_TARGETS:=$(ORGS_MODEL)

default: build

build: $(BUILD_TARGETS)

all: build # legacy makefile convention

clean:
	rm -rf $(DIST)

$(ORGS_MODEL): $(ORGS_MODEL_FILES)
	JS_SOURCEMAP=true $(CATALYST_SCRIPTS) build


$(ALL_SRC_BUILT_FILES) &: $(ALL_SRC_FILES)
	JS_SRC=$(ORGS_MODEL_SRC) $(CATALYST_SCRIPTS) pretest

last-test.txt: $(ALL_SRC_BUILT_FILES)
	( set -e; set -o pipefail; \
		JS_SRC=$(TEST_STAGING) $(CATALYST_SCRIPTS) test 2>&1 | tee last-test.txt; )

test: last-test.txt

# lint rules

last-lint.txt: $(ALL_SRC_FILES)
	( set -e; set -o pipefail; \
		JS_LINT_TARGET=$(ORGS_MODEL_SRC) $(CATALYST_SCRIPTS) lint | tee last-lint.txt; )

lint: last-lint.txt
	
lint-fix:
	JS_LINT_TARGET=js $(CATALYST_SCRIPTS) lint-fix
	
qa: test lint
