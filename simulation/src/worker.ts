self.onmessage = (event: MessageEvent) => {
    console.log(event.data)

    self.postMessage("test result")
}

