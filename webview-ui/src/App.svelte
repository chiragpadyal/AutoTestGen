<script lang="ts">
  // import snarkdown from 'snarkdown'
  import {
    provideVSCodeDesignSystem,
    vsCodeButton,
    vsCodeDivider,
    vsCodeDropdown,
    vsCodeOption,
    vsCodeTextArea,
    vsCodeTextField,
  } from "@vscode/webview-ui-toolkit";
  import { vscode } from "./utilities/vscode";
  import { onMount } from "svelte";
  import { AllowedTag } from "../../src/types/allowedTags";
  import hljs from "highlight.js";
  import 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css';
  import { copyFile } from "fs";

  // import java from 'highlight.js/lib/languages/java';

  let projectFolder = [];
  let selected;
  let btnRef;

  //@ts-ignore
  // hljs.highlightAll();

  provideVSCodeDesignSystem().register(
    vsCodeButton(),
    vsCodeTextField(),
    vsCodeTextArea(),
    vsCodeDropdown(),
    vsCodeOption(),
    vsCodeDivider()
  );

  function handleHowdyClick() {
    vscode.postMessage({
      command: "hello",
      text: "Howdy!",
    });
  }

  function checkHealth() {
    vscode.postMessage({
      command: "health",
      text: "Howdy!",
    });
  }

  function save() {
    var data = projectFolder[selected.selectedIndex];
    if (!data) {
      return;
    }
    vscode.postMessage({
      command: "compile",
      text: data || "...",
    });
  }

  function numberRounder(num: number, precision: number = 1): string {
    const map = [
      { suffix: "T", threshold: 1e12 },
      { suffix: "B", threshold: 1e9 },
      { suffix: "M", threshold: 1e6 },
      { suffix: "K", threshold: 1e3 },
      { suffix: "", threshold: 1 },
    ];

    const found = map.find((x) => Math.abs(num) >= x.threshold);
    if (found) {
      const formatted = (num / found.threshold).toFixed(precision) + found.suffix;
      return formatted;
    }

    return num.toString();
  }

  function parseRequest() {
    var data = projectFolder[selected.selectedIndex];
    if (!data) {
      return;
    }
    btnRef.disabled = true;
    vscode.postMessage({
      command: "parse-project",
      text: data || "...",
    });
  }


  // const copytoClipboard = (btn) => {
  //   const code = btn.previousElementSibling.textContent;
  //   navigator.clipboard.writeText(code);
  // };
  
  function parseMarkdown(markdown) {
    let trimmedMarkdown = "";

    // Regular expression to match code blocks inside triple backticks
    const codeBlockRegex = /```[\s\S]+?```/g;

    // Replace code blocks with trimmed content
    trimmedMarkdown = markdown.replace(codeBlockRegex, (match) => {
      const codeContent = match.slice(3, -3).trim();
      const highlightedCode = hljs.highlightAuto(codeContent).value;
      return `
        <pre style="position: relative;">
          <code class="hljs">${highlightedCode}</code>
          <button class="badge-code" onclick="copyToClipboard(this)">Copy</button>
        </pre>`;
    });

    return trimmedMarkdown;
  }

  onMount(() => {

    //@ts-ignore
    window.copyToClipboard = function(btn) {
      const code = btn.previousElementSibling.textContent;
      navigator.clipboard.writeText(code);
    };

  
    window.addEventListener("message", (event) => {
      console.log(event.data);
      switch (event.data.command) {
        case "parse":
          projectFolder = event.data.text || [];
          break;
        case "parse-done":
          btnRef.disabled = false;
          break;
        case "update-text-field":
          textField.value += ` ${event.data.text} `;
          break;
        case "reply":
          console.log("Received a reply from the bot");
          messages.push({
            role: event.data.from || "bot",
            content: event.data.text,
          });
          messages = [...messages]; // Force Svelte to re-render the messages
          textField.disabled = false; // Re-enable the text field
          break;
        case "chain-reply":
          console.log("Received a reply from the bot");
          messages.push({
            role: event.data.from || "bot",
            content: event.data.text,
          });
          messages = [...messages]; // Force Svelte to re-render the messages
          // not re-enable the text field until the chain is done
          if (event.data.isChainDone) {
            textField.disabled = false; // Re-enable the text field
          }
          break;
        default:
          break;
      }
    });

    if (textField.addEventListener !== undefined) {
      textField.addEventListener("keyup", (event: any) => {
        prompt = event.target.value;
      });
      // enter key
      textField.addEventListener("keydown", (event: any) => {
        if (event.key === "Enter") {
          ask();
        }
      });
    }
  });

  let prompt = "";
  let messages = [{ role: "bot", content: "Hello, how can I assist you today?" }];
  let textField: any = null;
  const allowedTag: string[] = Object.values(AllowedTag);

  const ask = () => {
    if (prompt === "") {
      return;
    }
    textField.disabled = true; // Disable the text field while the bot is responding
    messages.push({ role: "user", content: prompt });
    // TODO: Temp fix
    messages = [...messages]; // Force Svelte to re-render the messages
    vscode.postMessage({
      command: "ask",
      text: prompt,
    });
  };
</script>
<h1>AutoTestGen</h1>
<vscode-divider></vscode-divider>

<div class="dropdown-container">
  <label for="projectFolder">Projects: </label>
  <vscode-dropdown class="form-control full" id="projectFolder" bind:this={selected}>
    {#each projectFolder as folder}
      <vscode-option value={folder.name}>{folder.name}</vscode-option>
    {/each}
  </vscode-dropdown>
</div>
<vscode-divider></vscode-divider>

<div class="chat-container">
  {#each messages as message}
    <div class="message-container">
      <div class="message-role">{message.role}</div>
      {#if message.role === "user"}
        {#each message.content.split(" ") as word}
          {#if word.startsWith("/") && allowedTag.includes(word)}
            <span class="tag">{word}</span>
          {:else}
            {word}
          {/if}
          {" "}
        {/each}
      {:else}
        {@html parseMarkdown(message.content)}
      {/if}
    </div>
    <vscode-divider></vscode-divider>
  {/each}
</div>
<div class="search-container">
  <div class="full-chat">
    <vscode-text-field
      bind:this={textField}
      value={prompt}
      class="form-control search-box"
      rows="3"
      style="resize: vertical;"
      placeholder="Type your message here..."
      cols="5"
    >
    <vscode-button slot="end" appearance="icon" class="btn" on:click={ask}>
      <span class="codicon codicon-search"></span>
    </vscode-button>
  </vscode-text-field>
  </div>
</div>

<style global>

  /* @import url("https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css"); */
  .full {
    width: 100%;
    margin-bottom: 0.5em;
  }

  .search-container {
    position: fixed;
    bottom: 0;
    width: 90%;
    padding-bottom: 5%;
  }
  .chat-container {
    /* height: 90vh; Adjust the height as needed */
    overflow-y: auto; /* Add a scrollbar if the content overflows */
    padding-bottom: 100px;
  }

  .message-container {
    margin: 10px 0;
  }

  .message-role {
    font-weight: bold;
    margin-bottom: 5px;
  }
  .full-chat {
    display: flex;
    align-items: end;
  }

  .search-box {
    flex-grow: 8;
    margin-right: 10px;
  }

  .btn {
    flex-grow: 2;
  }

  .tag {
    background-color: #3498db; /* Background color */
    color: white; /* Text color */
    padding: 2px 6px; /* Padding for spacing */
    border-radius: 4px; /* Rounded corners */
  }

  :global(.hljs) {
    /* padding: 10px;
    font-size: 14px; */
    max-height: 30vh;
    overflow: scroll;
    background-color: var(--vscode-editor-background) !important;
  }

  :global(.badge-code){
  background-color: rgba(0, 0, 0, 0.3);
  position: absolute;
  top: 1.5em;
  right: 1em;
  text-transform: uppercase;
  font-weight: bold;
  font-size: 0.75rem; /* This is an approximation, adjust as needed */
  border-bottom-left-radius: 0.375rem; /* This is an approximation, adjust as needed */
  padding: 0.25rem 0.5rem; /* This is an approximation, adjust as needed */

  }
</style>