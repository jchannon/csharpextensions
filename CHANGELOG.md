# Change Log
All notable changes to this project will be documented in this file.

## [1.3.0] - 2017-03-01
### Added
- Ability to create property and read-only property from constructor

### Changed
- Fix for placing field outside class in some circumstances

## [1.2.1] - 2017-03-01
### Added
- Ability to turn "this" prefix on and off

### Changed 

- Detect base classes for initializing members 

## [1.2.0] - 2017-02-02
### Added
- Ability to create new class/interface if using csproj files on .Net Core

## [1.1.0] - 2016-11-25
### Added
- Initialize fields from constructor
- Initialize constructor from properties

## [1.0.9] - 2016-11-03
### Changed
- Bug fix for paths with spaces in them, creates namespace with underscore insteadnot sure

## [1.0.8] - 2016-10-28
### Changed
- Bug fix for paths with multiple hyphens

## [1.0.7] - 2016-10-18
### Changed
- Bug fix for extension of new file

## [1.0.6] - 2016-10-17
### Changed
- If no extension exists then it will add .cs on the end

## [1.0.5] - 2016-10-17
### Changed
- Ask only for filename instead of full path

## [1.0.4] - 2016-10-17
### Changed
- If path containes hyphen in path, make sure this becomes an underscore like VS

## [1.0.3] - 2016-10-16
### Changed
- Removed change log from release notes.md

## [1.0.2] - 2016-10-16
### Added
- Works on Windows

## [1.0.1] - 2016-10-14
### Added
- Can create class from root folder
- Templates can specifiy where cursor exists

## [1.0.0] - 2016-10-14
### Added
- Intial Release