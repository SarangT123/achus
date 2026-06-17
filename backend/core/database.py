from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, String, Integer, Text, DateTime, func

from .config import settings


engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Module(Base):
    __tablename__ = "modules"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    enabled = Column(Integer, default=1)
    installed_at = Column(DateTime, server_default=func.now())


class PrintQueue(Base):
    __tablename__ = "print_queue"

    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    status = Column(String, default="queued")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    printed_at = Column(DateTime, nullable=True)


class ConversionLog(Base):
    __tablename__ = "conversion_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    module = Column(String, nullable=False)
    operation = Column(String, nullable=False)
    input_name = Column(String, nullable=True)
    output_name = Column(String, nullable=True)
    input_size = Column(Integer, nullable=True)
    output_size = Column(Integer, nullable=True)
    success = Column(Integer, default=1)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session():
    async with async_session() as session:
        yield session
