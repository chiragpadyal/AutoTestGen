<script lang="ts">
    import { onMount } from "svelte";

    let sysText = "Write java test case for following code, {{custom prompt}}: {{code}} ";
    let cusText = "";
    let fileLoc = "{projectroot}/src/test/**/{class-name}-test.java";
    function fetchText() {
        // send message to the extension asking for the selected text
        tsvscode.postMessage({ type: "onFetchText", value: "" });
    }

    onMount(() => {
        // Listen for messages from the extension
        window.addEventListener("message", (event) => {
            const message = event.data;
            switch (message.type) {
                case "onSelectedText": {
                    // text = message.value;
                    break;
                }
            }
        });
    });
</script>



<h1>AutoTestGen</h1>
<hr>

<label for="fileName">File Location: </label>
<input 
    class="form-control"
    type="text"
    id="text"
    bind:value={fileLoc}
    placeholder="Edit prompt here..."
/>

<label for="fileName">Temperature (Creativity): </label>
<!-- dropdown from  0 to 10 number -->
<select class="form-control" id="exampleFormControlSelect1">
    <option>0</option>
    <option>1</option>
    <option>2</option>
    <option>3</option>
    <option>4</option>
    <option>5</option>
    <option>6</option>
    <option>7</option>
    <option>8</option>
    <option>9</option>
    <option>10</option>
</select>
<hr>

<label for="fileName">System Prompt: </label>

<textarea
    class="form-control"
    rows="3"
    id="text"
    style="resize: vertical;"
    minlength="15"
    bind:value={sysText}
    placeholder="Edit System prompt here..."
/>
<label for="fileName">Custom Prompt: </label>

<textarea
    class="form-control"
    rows="10"
    id="text"
    style="resize: vertical;"
    minlength="15"
    bind:value={cusText}
    placeholder="Edit Custom prompt here..."
/>
<button on:click={fetchText}>Save</button>
<button on:click={fetchText}>Restore to Default</button>