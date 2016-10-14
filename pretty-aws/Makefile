setup:
	@echo "Downloading Node 6"
	wget -O vendor/node6.tar.gz https://nodejs.org/dist/v6.8.0/node-v6.8.0-darwin-x64.tar.gz
	cd vendor && tar -xzf node6.tar.gz
	@echo "Testing node, running node --version"
	@./vendor/node-v6.8.0-darwin-x64/bin/node --version
	@echo "Installing node_modules"
	@./vendor/node-v6.8.0-darwin-x64/bin/npm install
	@echo "Run like: ./vendor/node-v6.8.0-darwin-x64/bin/node index.js"
