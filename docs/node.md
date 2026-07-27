# node setup

## nvm (Node Version Manager)
1.	Curl the nvm stuff:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```
2.	Shutdown the terminal and source it.
3.	Some nvm commands:
```bash
nvm install --lts
nvm use --lts
nvm --version
```
4.	Some node/npm (Node.js and its package manager)
```bash
node --version
npm --version
```
5.	After all this, this is where the daily workflow start:
```bash
npm install	#installs what's on package.json
npm install <package-name>	#installs one new package and adds it to package.json
npm install -g <package-name>	#install global usable anywhwere
npm run build	#runs the "build" script defined in package.json
npm run start	#runs the "start" script (starts the app)
```
6.	To install nestjs command-line tool globally:
```bash
npm install -g @nestjs/cli
```
