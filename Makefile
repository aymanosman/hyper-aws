VERSION = 0.1
build:
	docker build -t haw:${VERSION} .

push:
	docker tag haw:0.1 aymanosman/haw:${VERSION}
	docker push aymanosman/haw:${VERSION}
