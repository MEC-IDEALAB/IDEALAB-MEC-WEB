# IDEALAB MEC product identity — 2 November 2026

The owner selected **IDEALAB MEC** for both the website and the mobile app
(previously Grow). This identifies the Model Engineering College lab rather
than implying that this application represents every IDEA Lab in India.
Use `idealab_mec` for new internal product labels where an underscore identifier
is required; public UI uses the readable name.

## Implemented locally

The website title already used IDEALAB MEC. Its install manifest short name and
account/project/visit copy now use that same identity. The Flutter app launcher
label, Material app title, splash, Home header, login/signup, onboarding, member
card and interest/profile copy use IDEALAB MEC. The longer header has a bounded
layout so its actions retain space on narrow screens.

## Compatibility boundaries

The existing Flutter Dart package `grow`, package imports, Android application
ID, OAuth callback scheme `com.idealab.mec.grow`, QR payload prefixes and database
project reference remain stable. These are integration identifiers. Renaming
them requires a separately coordinated callback, installed-app, signing and
stored-QR migration, rather than a text replacement. Existing source paths,
repository names and historical evidence retain their original names.

Use the existing shared Supabase project (`huftzhfqnnslvnfzvbex`, dashboard label
`grow-idealab`) for both clients. No second account database, bucket copy, project
creation or deletion is needed for this display-name change. Existing user IDs,
roles and stored objects are preserved. Dashboard and OAuth consent branding
have not been changed or verified by this local UI update.

## Release state

This change is local and has not been deployed or released as a signed Android
app. Full shared account migration approval, coordinated client cutover, provider
acceptance and email delivery remain distinct requirements; see
[shared backend status](shared-backend-configuration-2026-11-02.md).

Tracking: [Grow organization issue #15](https://github.com/MEC-IDEALAB/Grow-by-IL/issues/15),
added to the organization delivery project as In Progress. The issue remains open
until hosted/signed-app identity and applicable release checks are verified.

## Owner-requested package rename (later 2 November)

The owner then explicitly requested a new technical package identity. This
supersedes the earlier package-preservation decision above: Dart is now
`idealab_mec`; Android application ID/namespace is `in.ac.mec.idealab`; native
callback is `in.ac.mec.idealab://auth/callback`. Source imports, Kotlin activity,
manifest, auth callbacks/tests and CI package fixture are updated. All 355 Flutter
tests and full analysis pass. New Android OAuth/Firebase registration and native
redirect allowlisting remain required; no real credential/config file was altered.
The Supabase authority and account IDs remain unchanged. Web callback URLs do not
change. Android treats this identity as a separate app, with separate local data.
