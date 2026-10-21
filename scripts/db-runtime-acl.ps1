param([Parameter(Mandatory = $true)][string]$Path)
$ErrorActionPreference = 'Stop'
$taskProject = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskParent = [IO.Path]::GetFullPath((Join-Path $taskProject 'artifacts/database-runtime'))
$taskTarget = [IO.Path]::GetFullPath($Path)
if ([IO.Path]::GetDirectoryName($taskTarget) -ne $taskParent -or [IO.Path]::GetFileName($taskTarget) -notlike 'cluster-*') { throw 'Refusing ACL changes outside a fresh scratch-cluster directory.' }
$taskAncestor = New-Object IO.DirectoryInfo($taskTarget)
while ($null -ne $taskAncestor) {
    if ($taskAncestor.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Scratch directory ancestors must not contain junctions or symbolic links.' }
    $taskAncestor = $taskAncestor.Parent
}
if (-not [IO.Directory]::Exists($taskTarget) -or ([IO.File]::GetAttributes($taskTarget) -band [IO.FileAttributes]::ReparsePoint)) { throw 'Scratch directory must be an ordinary directory.' }
if (@([IO.Directory]::EnumerateFileSystemEntries($taskTarget)).Count -ne 0) { throw 'Refusing to change ACLs on a populated directory.' }
$taskSid = [Security.Principal.WindowsIdentity]::GetCurrent().User
if ([IO.Directory]::GetAccessControl($taskTarget).GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $taskSid.Value) { throw 'Scratch directory must already belong to the current user.' }
$taskAcl = New-Object Security.AccessControl.DirectorySecurity
$taskAcl.SetAccessRuleProtection($true, $false)
$taskRule = New-Object Security.AccessControl.FileSystemAccessRule($taskSid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
$taskAcl.AddAccessRule($taskRule)
[IO.Directory]::SetAccessControl($taskTarget, $taskAcl)
if (@([IO.Directory]::EnumerateFileSystemEntries($taskTarget)).Count -ne 0) { throw 'Scratch directory changed before its private ACL was established.' }
$taskVerified = [IO.Directory]::GetAccessControl($taskTarget)
$taskRules = @($taskVerified.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
if (-not $taskVerified.AreAccessRulesProtected -or $taskVerified.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $taskSid.Value -or $taskRules.Count -ne 1) { throw 'Scratch-directory ACL verification failed.' }
$taskVerifiedRule = $taskRules[0]
if ($taskVerifiedRule.IdentityReference.Value -ne $taskSid.Value -or $taskVerifiedRule.AccessControlType -ne 'Allow' -or $taskVerifiedRule.FileSystemRights -ne 'FullControl' -or $taskVerifiedRule.InheritanceFlags -ne 'ContainerInherit, ObjectInherit') { throw 'Scratch-directory access rule verification failed.' }
'{"aclProtected":true,"ownerConfirmed":true,"allowedPrincipals":1}'
