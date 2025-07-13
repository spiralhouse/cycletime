// Mock for node-fetch to solve ES module issues in Jest
const mockFetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

module.exports = mockFetch;
module.exports.default = mockFetch;