CMD=aws lambda
CREATE_CMD=create-function
DELETE_CMD=delete-function
UPDATE_CMD=update-function-code
UPDATE_CONFIG_CMD=update-function-configuration
TEST_CMD=invoke-async
TEST_EVENT=image_event.json

PROFILE=$(AWSP) # if you want to use a different profile, set env variable AWSP=--profile <profile name>
FUNC_NAME=--function-name thumbnail
TIMEOUT=60

HANDLER=thumb
SRC_FILE=$(HANDLER)_src.js
ZIP_FILE=$(HANDLER).zip
HANDLER_FILE=$(HANDLER).js
NODE_MODULES=node_modules

deploy: zip
	$(CMD) $(UPDATE_CMD) $(FUNC_NAME) $(PROFILE) --zip-file fileb://$(ZIP_FILE)

update:
	$(CMD) $(UPDATE_CONFIG_CMD) $(FUNC_NAME) $(PROFILE) --timeout 60

test:
	$(CMD) $(TEST_CMD) $(FUNC_NAME) $(PROFILE) --invoke-args $(TEST_EVENT) --debug

zip:
	@rm -f $(ZIP_FILE)
	@babel $(SRC_FILE) > $(HANDLER_FILE)
	@zip -r $(ZIP_FILE) $(NODE_MODULES) $(HANDLER_FILE)

create: zip
	$(CMD) $(CREATE_CMD) $(FUNC_NAME) $(PROFILE) \
					--zip-file fileb://$(ZIP_FILE) \
					--role $(LAMBDA_ROLE) \
					--handler $(HANDLER).handler \
					--runtime nodejs \
					--timeout $(TIMEOUT) \
					--debug \
	# arn:aws:s3 is not supported by cli yet
	#$(CMD) $(CREATE_EVENT_SRC_CMD) $(FUNC_NAME) $(PROFILE) \
					--event-source-arn arn:aws:s3:::tchen-lambda --enabled \
					--starting-position LATEST

delete:
	$(CMD) $(DELETE_CMD) $(FUNC_NAME) $(PROFILE)
