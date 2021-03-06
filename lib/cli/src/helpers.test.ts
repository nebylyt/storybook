import fs from 'fs';
import fse from 'fs-extra';

import * as helpers from './helpers';
import { SupportedLanguage, SupportedFrameworks } from './project_types';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('fs-extra', () => ({
  copySync: jest.fn(() => ({})),
  ensureDir: jest.fn(() => {}),
  existsSync: jest.fn(),
}));

jest.mock('path', () => ({
  // make it return just the second path, for easier testing
  resolve: jest.fn((_, p) => p),
}));

describe('Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('copyTemplate', () => {
    it(`should copy template files when directory is present`, () => {
      const csfDirectory = `template-csf/`;
      (fs.existsSync as jest.Mock).mockImplementation((filePath) => {
        return true;
      });
      helpers.copyTemplate('');

      const copySyncSpy = jest.spyOn(fse, 'copySync');
      expect(copySyncSpy).toHaveBeenCalledWith(csfDirectory, expect.anything(), expect.anything());
    });

    it(`should throw an error if template directory cannot be found`, () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath) => {
        return false;
      });

      expect(() => {
        helpers.copyTemplate('');
      }).toThrowError("Couldn't find template dir");
    });
  });

  it.each`
    language        | exists          | expected
    ${'javascript'} | ${['js', 'ts']} | ${'/js'}
    ${'typescript'} | ${['js', 'ts']} | ${'/ts'}
    ${'typescript'} | ${['js']}       | ${'/js'}
    ${'javascript'} | ${[]}           | ${''}
    ${'typescript'} | ${[]}           | ${''}
  `(
    `should copy $expected when folder $exists exists for language $language`,
    ({ language, exists, expected }) => {
      const componentsDirectory = exists.map((folder: string) => `frameworks/react/${folder}`);
      const expectedDirectory = `frameworks/react${expected}`;
      (fse.existsSync as jest.Mock).mockImplementation((filePath) => {
        return componentsDirectory.includes(filePath) || filePath === 'frameworks/react';
      });
      helpers.copyComponents('react', language);

      const copySyncSpy = jest.spyOn(fse, 'copySync');
      expect(copySyncSpy).toHaveBeenNthCalledWith(
        1,
        expectedDirectory,
        './stories',
        expect.anything()
      );
      expect(copySyncSpy).toHaveBeenNthCalledWith(
        2,
        'frameworks/common',
        './stories',
        expect.anything()
      );
    }
  );

  it(`should copy to src folder when exists`, () => {
    (fse.existsSync as jest.Mock).mockImplementation((filePath) => {
      return filePath === 'frameworks/react' || filePath === './src';
    });
    helpers.copyComponents('react', SupportedLanguage.JAVASCRIPT);
    expect(fse.copySync).toHaveBeenCalledWith(
      expect.anything(),
      './src/stories',
      expect.anything()
    );
  });

  it(`should copy to root folder when src doesn't exist`, () => {
    (fse.existsSync as jest.Mock).mockImplementation((filePath) => {
      return filePath === 'frameworks/react';
    });
    helpers.copyComponents('react', SupportedLanguage.JAVASCRIPT);
    expect(fse.copySync).toHaveBeenCalledWith(expect.anything(), './stories', expect.anything());
  });

  it(`should throw an error for unsupported framework`, () => {
    const framework = 'unknown framework' as SupportedFrameworks;
    const expectedMessage = `Unsupported framework: ${framework}`;
    expect(() => {
      helpers.copyComponents(framework, SupportedLanguage.JAVASCRIPT);
    }).toThrowError(expectedMessage);
  });
});
