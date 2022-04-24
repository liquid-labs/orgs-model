.DELETE_ON_ERROR:
.PHONY: all lint lint-fix qa test

NPM_BIN:=$(shell npm bin)
CATALYST_SCRIPTS:=$(NPM_BIN)/catalyst-scripts

DIST=dist
ORGS_MODEL_SRC:=js/
ORGS_MODEL_FILES:=$(shell find $(ORGS_MODEL_SRC) -type f -not -path "*/test/*")
ORGS_MODEL:=$(DIST)/orgs-model.js

BUILD_TARGETS:=$(ORGS_MODEL)

default: all

all: $(BUILD_TARGETS)

$(ORGS_MODEL): $(ORGS_MODEL_FILES)
	JS_SOURCEMAP=true $(CATALYST_SCRIPTS) build

test:
	$(CATALYST_SCRIPTS) pretest
	$(CATALYST_SCRIPTS) test

lint:
	$(CATALYST_SCRIPTS) lint
	
lint-fix:
	$(CATALYST_SCRIPTS) lint-fix
	
qa: test lint
