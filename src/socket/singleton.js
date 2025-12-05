let ioInstance = null;

export const setIO = (io) => {
  ioInstance = io;
};

export const io = {
  emit: (...args) => ioInstance?.emit(...args),
  to: (...args) => ioInstance?.to(...args),
  get raw() { return ioInstance; }
};
