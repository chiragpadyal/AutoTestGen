<script lang="ts">
  import {
    provideVSCodeDesignSystem,
    vsCodeButton,
    vsCodeDivider,
    vsCodeDropdown,
    vsCodeOption,
    vsCodeTextField,
  } from "@vscode/webview-ui-toolkit";
  import { vscode } from "./utilities/vscode";
  import { onMount } from "svelte";
  import {AllowedTag} from "../../src/types/allowedTags"
  let projectFolder = [];
  let selected ;
  let btnRef;
  let numberOfTests: number = 0;
  let numberOfMethods: number = 0;


  provideVSCodeDesignSystem().register(
    vsCodeButton(),
    vsCodeTextField(),
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
      text: data || "..."
    });
  }

  function numberRounder(num:number, precision:number = 1): string {
    const map = [
      { suffix: 'T', threshold: 1e12 },
      { suffix: 'B', threshold: 1e9 },
      { suffix: 'M', threshold: 1e6 },
      { suffix: 'K', threshold: 1e3 },
      { suffix: '', threshold: 1 },
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
  

    onMount(() => {
        window.addEventListener('message', event => {
            console.log(event.data);
            switch (event.data.command) {
                case 'parse':
                    projectFolder = event.data.text || [];
                    break;
                case 'parse-done':
                    btnRef.disabled = false;
                    numberOfTests = event.data.text['no-of-tests'] || 0;
                    numberOfMethods = event.data.text['no-of-mains'] || 0;
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
                default:
                    break;
            }
        });

        if (textField.addEventListener !== undefined) {
          textField.addEventListener("keyup", (event: any) => {
            prompt = event.target.value;
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
            <vscode-option value={folder.name}
            >{folder.name}</vscode-option>
        {/each}
    </vscode-dropdown>
  </div>
<vscode-divider></vscode-divider>
<vscode-button class="full" on:click={save}>Compile</vscode-button>
<vscode-button class="full" on:click={parseRequest} bind:this={btnRef}>Parse Projects</vscode-button>
<vscode-button class="full" on:click={checkHealth}>Doctor</vscode-button>

<div class="chat-container">
  {#each messages as message}
    <div class="message-container">
      <div class="message-role">{message.role}</div>
      {#each message.content.split(' ') as word}
      {#if word.startsWith('/') && allowedTag.includes(word)}
        <span class="tag">{word}</span>
      {:else}
        {word} 
      {/if}
      {' '}
    {/each}
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
      minlength="15"
      placeholder="Type your message here..."
    >
      <vscode-button slot="end" appearance="icon" class="btn" on:click={ask}>
        <span class="codicon codicon-search"></span>
      </vscode-button>
    </vscode-text-field>
  </div>
</div>

<style>

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
    flex-grow: 8; /* Take up 80% of the space */
    margin-right: 10px; /* Add some space between the text field and button */
  }

  .btn {
    flex-grow: 2; /* Take up 20% of the space */
  }

  .tag{
    background-color: #3498db; /* Background color */
    color: white; /* Text color */
    padding: 2px 6px; /* Padding for spacing */
    border-radius: 4px; /* Rounded corners */
  }
</style>
