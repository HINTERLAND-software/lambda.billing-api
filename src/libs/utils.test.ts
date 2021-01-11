import { httpResponse } from './apiGateway';
import { getEnvironment, Logger } from './utils';

describe('utils.ts', () => {
  describe('httpResponse', () => {
    it('returns http success response', () => {
      const response = httpResponse(200, 'test', { foo: 'bar' });
      expect(response).toEqual({
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': '*',
        },
        body: JSON.stringify({
          message: 'test',
          result: { foo: 'bar' },
        }),
      });
    });
    it('returns http error response', () => {
      const response = httpResponse(400, 'test', { foo: 'bar' });
      expect(response).toEqual({
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': '*',
        },
        body: JSON.stringify({
          message: 'test',
          result: { foo: 'bar' },
        }),
      });
    });
  });

  describe('Logger', () => {
    let spyLog;
    let spyWarn;
    let spyInfo;
    let spyError;
    beforeEach(() => {
      spyLog = jest.spyOn(console, 'log');
      spyWarn = jest.spyOn(console, 'warn');
      spyInfo = jest.spyOn(console, 'info');
      spyError = jest.spyOn(console, 'error');
    });
    it('calls only console.error if run in test', () => {
      Logger.log('log');
      Logger.warn('warn');
      Logger.info('info');
      Logger.error('error');
      expect(spyLog).not.toHaveBeenCalled();
      expect(spyWarn).not.toHaveBeenCalled();
      expect(spyInfo).not.toHaveBeenCalled();
      expect(spyError).toHaveBeenCalledWith('error');
    });
  });

  describe('getEnvironment', () => {
    it('development', () => {
      process.env.STAGE = 'development';
      const result = getEnvironment();
      expect(result).toBe('development');
    });

    it('production', () => {
      process.env.STAGE = 'production';
      const result = getEnvironment();
      expect(result).toBe('production');
    });
  });
});
