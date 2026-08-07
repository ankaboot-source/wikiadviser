# Contributing to WikiAdviser

First off, thank you for taking the time to contribute! ❤️

We value all types of contributions and encourage everyone to get involved. Please refer to the [Table of Contents](#table-of-contents) to find the different ways you can help and detailed guidelines on how to contribute. Reading the relevant section before making your contribution will make it easier for the maintainers and enhance the overall experience for everyone. The community eagerly awaits your contributions! 🎉

> If you appreciate the project but don't have time to contribute, that's okay! There are other ways you can support us:
>
> - Star the project on GitHub
> - Mention this project in your project's README
> - Share it at local meetups, with friends/colleagues and on social networks

## Table of Contents

- [I Have a Question](#i-have-a-question)
- [I Want To Contribute](#i-want-to-contribute)
  - [Install for development purpose](#install-for-development)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
  - [Improving the Documentation](#improving-the-documentation)

## I Have a Question

> If you want to ask a question, we assume that you have read the available [Documentation](https://github.com/ankaboot-source/wikiadviser/blob/main/README.md).

Before you ask a question, it is best to search for existing [Issues](https://github.com/ankaboot-source/wikiadviser/issues) that might help you. In case you have found a suitable issue and still need clarification, you can write your question in this issue. It is also advisable to search the internet for answers first.

If you then still feel the need to ask a question and need clarification, we recommend the following:

- Open an [Issue](https://github.com/ankaboot-source/wikiadviser/issues/new).
- Provide as much context as you can about what you’re running into.
- Provide project and platform versions (nodejs, npm, etc), depending on what seems relevant.

We will then take care of the issue as soon as possible.

## I Want To Contribute

### Install & Run WikiAdviser for development

1. Install

   - Setup MediaWiki locally
     ```sh
     pushd docker && docker compose up -d mediawiki mediawiki_db && popd
     ```

   - Install dependencies (This project uses `pnpm`)
     ```sh
     npm install -g pnpm # Install pnpm
     npm run install-deps # Install frontend & Supabase
     ```

2. Run WikiAdviser
   ```sh
   npm run dev:supabase > supabase.log # Start Supabase
   ./generate-env.sh --supabase-creds supabase.log # Update Supabase env variables
   ./generate-env.sh --bot-creds # Update bot password env variables
   npm run dev:frontend # Start the frontend
   npm run dev:supabase-functions # Start Supabase functions
   ```

### Contributor License Agreement (CLA)

By submitting a contribution to the Software, you ("Contributor") agree to the following:

1. **License to the Public:** You grant the public a non-exclusive, perpetual, worldwide, royalty-free license to use, modify, and distribute your contribution under the AGPL (Affero General Public License).
2. **License to Ankaboot:** You grant Ankaboot ("Publisher") a non-exclusive, perpetual, worldwide, royalty-free license to use, modify, distribute, sublicense, and sell your contribution under any license, including proprietary licenses.
3. **Representations:** You confirm that you are the sole author of the contribution and have the right to grant these licenses.

### Your First Code Contribution

Follow these steps to make your first code contribution:

1. Fork this [repository](https://github.com/ankaboot-source/wikiadviser)
2. Create a branch for your feature or bug fix (`git checkout -b feature/fooBar`)
3. Commit your changes (`git commit -am 'Add some fooBar'`)
4. Push to the branch (`git push origin feature/fooBar`)
5. Pull Request with a clear title and description.

### Using the `/oc` GitHub Agent

WikiAdviser runs an OpenCode agent on GitHub Actions. Mention `/oc` (or `/opencode`) in a comment on an issue or PR, and the agent will execute the request in a cloud runner and reply. It uses the runner's `GITHUB_TOKEN` (no bot account) and the `OPENROUTER_API_KEY` org secret.

**Command vocabulary**

| Command | What it does |
| --- | --- |
| `/oc explain <topic>` | Investigate and explain an issue or piece of code. |
| `/oc fix <issue>` | Implement a fix and open a PR with the changes. |
| `/oc <change>` on a PR | Implement the requested change and commit it to the same PR. |
| `/oc <change>` on a code line | Reply to an inline review comment; the agent gets the file, line numbers, and diff context. |
| `/oc merge` | Merge the PR (after removing `pr-context.md`). |

**How it works**

- The workflow triggers on `issue_comment` and `pull_request_review_comment` events containing `/oc`.
- The agent follows `AGENTS.md` for build/test/lint commands and conventions.
- After UI changes, the agent writes affected routes to `.opencode/screens.txt`; the workflow then captures before/after screenshots (desktop + mobile) via `scripts/screenshots.sh` and posts them as a build artifact with a link in the PR comment.
- One pass per comment — a human triggers each hop. `GITHUB_TOKEN` events do not re-trigger workflows, so agent-to-agent chaining is not supported.

**Limitations (v1)**

- The runner has no Supabase backend; screenshots use a mock client (`USE_MOCK_BACKEND=true`) with a dummy user and dummy article/change data, so pages render real layouts but not real data.
- No WIP limit or token accounting.

### Reporting Bugs

#### Before Submitting a Bug Report

A good bug report shouldn’t leave others needing to chase you up for more information. Therefore, we ask you to investigate carefully, collect information and describe the issue in detail in your report. Please complete the following steps in advance to help us fix any potential bug as fast as possible.

- Make sure that you are using the latest version.
- Determine if your bug is really a bug and not an error on your side e.g. using incompatible environment components/versions (Make sure that you have read the [documentation](https://github.com/ankaboot-source/wikiadviser/blob/main/README.md). If you are looking for support, you might want to check [this section](#i-have-a-question)).
- To see if other users have experienced (and potentially already solved) the same issue you are having, check if there is not already a bug report existing for your bug or error in the [bug tracker](https://github.com/ankaboot-source/wikiadviser/issues?q=label%3Abug).
- Also make sure to search the internet (including Stack Overflow) to see if users outside of the GitHub community have discussed the issue.
- Collect information about the bug:
  - Stack trace (Traceback)
  - OS, Platform and Version (Windows, Linux, macOS, x86, ARM)
  - Version of the interpreter, compiler, SDK, runtime environment, package manager, depending on what seems relevant.
  - Possibly your input and the output
  - Can you reliably reproduce the issue? And can you also reproduce it with older versions?

#### How Do I Submit a Good Bug Report?

> You must never report security related issues, vulnerabilities or bugs including sensitive information to the issue tracker, or elsewhere in public. Instead sensitive bugs must be sent by email to [contact@ankaboot.io](mailto:contact@ankaboot.io).

We use GitHub issues to track bugs and errors. If you run into an issue with the project:

- Open an [Issue](https://github.com/ankaboot-source/wikiadviser/issues/new). (Since we can’t be sure at this point whether it is a bug or not, we ask you not to talk about a bug yet and not to label the issue.)
- Explain the behavior you would expect and the actual behavior.
- Please provide as much context as possible and describe the _reproduction steps_ that someone else can follow to recreate the issue on their own. This usually includes your code. For good bug reports you should isolate the problem and create a reduced test case.
- Provide the information you collected in the previous section.

Once it’s filed:

- The project team will label the issue accordingly.
- A team member will try to reproduce the issue with your provided steps. If there are no reproduction steps or no obvious way to reproduce the issue, the team will ask you for those steps and mark the issue as `needs-repro`. Bugs with the `needs-repro` tag will not be addressed until they are reproduced.
- If the team is able to reproduce the issue, it will be marked `needs-fix`, as well as possibly other tags (such as `critical`)

### Suggesting Enhancements

To suggest an enhancement:

#### Before Submitting an Enhancement

- Ensure you are using the latest version.
- Review the [documentation](https://github.com/ankaboot-source/wikiadviser/blob/main/README.md) to see if the functionality already exists.
- Search the [issues](https://github.com/ankaboot-source/wikiadviser/issues) to see if the enhancement has already been suggested. If so, add your comments there.
- Determine if your idea fits with the scope and aims of the project. It’s up to you to make a strong case to convince the project’s developers of the merits of this feature. Keep in mind that we want features that will be useful to the majority of our users and not just a small subset. If you’re just targeting a minority of users, consider writing an add-on/plugin library.

#### How Do I Submit a Good Enhancement Suggestion?

Enhancement suggestions are tracked as [GitHub issues](https://github.com/ankaboot-source/wikiadviser/issues).

- Use a **clear and descriptive title** for the issue to identify the suggestion.
- Provide a **step-by-step description of the suggested enhancement** in as many details as possible.
- **Describe the current behavior** and **explain which behavior you expected to see instead** and why. At this point you can also tell which alternatives do not work for you.
- You may want to **include screenshots and animated GIFs** which help you demonstrate the steps or point out the part which the suggestion is related to.
- **Explain why this enhancement would be useful** to most users. You may also want to point out the other projects that solved it better and which could serve as inspiration.

## Attribution

This guide is based on the [contributing-gen](https://github.com/bttger/contributing-gen).
