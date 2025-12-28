export default function Testing() {
	// Try to print counts of registered listeners (DevTools-only helper)
	if (!window.__enterHandlerInstalled) {
		window.__enterHandlerInstalled = true;
		window.addEventListener(
			"keydown",
			function onEnter(e) {
				if (e.key === "Enter" && !e.repeat)
                {
					console.warn("enter pressed");

                }
                else {
                    console.log("Other: ", e);
                }
			},
			true
		);
	}
}
