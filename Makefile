NPM_BIN:=$(shell npm bin)
CATALYST_SCRIPTS:=$(NPM_BIN)/catalyst-scripts
BASH_ROLLUP:=$(NPM_BIN)/bash-rollup

GLOSSARY_SRC:=src/liq-gen-glossary
GLOSSARY_SRC_JS:=$(GLOSSARY_SRC)/generate-glossary.js $(GLOSSARY_SRC)/index.js
GLOSSARY_GENERATOR_JS:=dist/generate-glossary.js
GLOSSARY_GENERATOR_BIN:=dist/liq-gen-glossary.sh

BUILD_TARGETS:=$(GLOSSARY_GENERATOR_BIN) $(GLOSSARY_GENERATOR_JS)

all: $(BUILD_TARGETS)

$(GLOSSARY_GENERATOR_JS): package.json $(GLOSSARY_SRC_JS)
	JS_SRC=$(GLOSSARY_SRC) JS_OUT=$@ $(CATALYST_SCRIPTS) build

$(GLOSSARY_GENERATOR_BIN): $(GLOSSARY_SRC)/liq-gen-glossary.sh $(GLOSSARY_GENERATOR_JS)
	$(BASH_ROLLUP) $< $@
