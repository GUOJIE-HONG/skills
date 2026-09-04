# Question templates for step 2 of `dont-know-how`

Pick the template matching the task shape. Drop any question the repo scan already answered. Reword each question in the task's own terms: name the actual system, vendor, or library rather than the placeholder.

## Round format

Number every question and state what you will do if the answer is "no". Ask the whole round at once, then wait.

```
❓ **Q1** - **<question title>**: <question body>

➡️ <what you will do if the answer is "no" or "don't know">

---

❓ **Q2** - ...
```

## Integrating with an external system

An AD server, a third-party API, a payment gateway, a partner's service.

1. **Documents from the counterpart**: any integration guide, API spec, interface contract, or onboarding email from the party that owns the system?
2. **Sample code**: any example the counterpart or a previous team wrote, in any language?
3. **Reachable environment**: a test or sandbox host, its address, and how to reach it (VPN, allowlist, port)?
4. **Credential access**: does suitable test access exist, how is it requested, and who manages it? Ask for the access path, never the password, API key, private key, token, or certificate secret itself.
5. **Protocol or interface**: has the counterpart named how to talk to it (LDAP, SAML, REST, SOAP, a vendor SDK)?
6. **Contact**: a person on the counterpart side who answers technical questions?
7. **Constraints**: deadline, security review, allowed languages or hosting, data that must stay on-premise?

## Adopting an unfamiliar library, framework, or tool

1. **Chosen or open**: has the team already picked this one, or is the choice still open?
2. **Version**: a required version, or one already pinned somewhere?
3. **Prior use**: has anyone nearby used it, and is there code or notes from that?
4. **Job to do**: the one concrete thing it must do first?
5. **Constraints**: license, runtime, platform, or compatibility limits?

## Implementing an unfamiliar protocol, standard, or concept

1. **Source spec**: a specification, RFC, or standard document named by whoever assigned the task?
2. **Counterpart**: is there another implementation you must interoperate with, and can you reach it?
3. **Reference implementation**: a known-good implementation to compare against?
4. **Test vectors**: sample inputs with expected outputs?
5. **Scope**: which parts of the standard are actually required?

## Building a business flow you have never built

1. **Owner**: who defines how the flow should behave?
2. **Existing artefacts**: process documents, screenshots of another system doing it, spreadsheets, tickets?
3. **Precedent**: a similar flow already in this or a sibling project?
4. **Edge cases**: the failure and exception paths the owner already knows about?
5. **Acceptance**: how the owner will judge it done?
