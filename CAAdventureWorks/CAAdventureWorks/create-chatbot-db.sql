IF DB_ID(N'AdventureWorksChatBot') IS NULL
BEGIN
    CREATE DATABASE [AdventureWorksChatBot];
END;
GO

USE [AdventureWorksChatBot];
GO

IF SCHEMA_ID(N'ChatBot') IS NULL
BEGIN
    EXEC(N'CREATE SCHEMA [ChatBot]');
END;
GO

IF OBJECT_ID(N'[ChatBot].[ChatSession]', N'U') IS NULL
BEGIN
    CREATE TABLE [ChatBot].[ChatSession]
    (
        [SessionId] UNIQUEIDENTIFIER NOT NULL,
        [DepartmentId] NVARCHAR(50) NOT NULL,
        [UserId] NVARCHAR(256) NOT NULL,
        [Title] NVARCHAR(256) NULL,
        [CreatedAt] DATETIME NOT NULL CONSTRAINT [DF_ChatBot_ChatSession_CreatedAt] DEFAULT (GETUTCDATE()),
        [LastMessageAt] DATETIME NULL,
        [IsActive] BIT NOT NULL CONSTRAINT [DF_ChatBot_ChatSession_IsActive] DEFAULT ((1)),
        CONSTRAINT [PK_ChatBot_ChatSession] PRIMARY KEY ([SessionId])
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ChatBot_ChatSession_UserId' AND object_id = OBJECT_ID(N'[ChatBot].[ChatSession]'))
BEGIN
    CREATE INDEX [IX_ChatBot_ChatSession_UserId]
        ON [ChatBot].[ChatSession]([UserId]);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ChatBot_ChatSession_DepartmentId' AND object_id = OBJECT_ID(N'[ChatBot].[ChatSession]'))
BEGIN
    CREATE INDEX [IX_ChatBot_ChatSession_DepartmentId]
        ON [ChatBot].[ChatSession]([DepartmentId]);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ChatBot_ChatSession_LastMessageAt' AND object_id = OBJECT_ID(N'[ChatBot].[ChatSession]'))
BEGIN
    CREATE INDEX [IX_ChatBot_ChatSession_LastMessageAt]
        ON [ChatBot].[ChatSession]([LastMessageAt]);
END;
GO

IF OBJECT_ID(N'[ChatBot].[AlertDefinition]', N'U') IS NULL
BEGIN
    CREATE TABLE [ChatBot].[AlertDefinition]
    (
        [AlertDefinitionId] INT IDENTITY(1,1) NOT NULL,
        [Code] NVARCHAR(64) NOT NULL,
        [Name] NVARCHAR(256) NOT NULL,
        [Description] NVARCHAR(512) NOT NULL CONSTRAINT [DF_ChatBot_AlertDefinition_Description] DEFAULT (N''),
        [DepartmentCode] NVARCHAR(64) NOT NULL,
        [DefaultThreshold] DECIMAL(18,2) NULL,
        [ThresholdUnit] NVARCHAR(32) NOT NULL CONSTRAINT [DF_ChatBot_AlertDefinition_ThresholdUnit] DEFAULT (N'Percent'),
        [RequiresParameters] BIT NOT NULL CONSTRAINT [DF_ChatBot_AlertDefinition_RequiresParameters] DEFAULT ((0)),
        [QueryTemplate] NVARCHAR(4000) NOT NULL CONSTRAINT [DF_ChatBot_AlertDefinition_QueryTemplate] DEFAULT (N''),
        [IsActive] BIT NOT NULL CONSTRAINT [DF_ChatBot_AlertDefinition_IsActive] DEFAULT ((1)),
        [CreatedAt] DATETIME NOT NULL CONSTRAINT [DF_ChatBot_AlertDefinition_CreatedAt] DEFAULT (GETUTCDATE()),
        [UpdatedAt] DATETIME NULL,
        CONSTRAINT [PK_ChatBot_AlertDefinition] PRIMARY KEY ([AlertDefinitionId])
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ChatBot_AlertDefinition_Code' AND object_id = OBJECT_ID(N'[ChatBot].[AlertDefinition]'))
BEGIN
    CREATE UNIQUE INDEX [IX_ChatBot_AlertDefinition_Code]
        ON [ChatBot].[AlertDefinition]([Code]);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ChatBot_AlertDefinition_DepartmentCode' AND object_id = OBJECT_ID(N'[ChatBot].[AlertDefinition]'))
BEGIN
    CREATE INDEX [IX_ChatBot_AlertDefinition_DepartmentCode]
        ON [ChatBot].[AlertDefinition]([DepartmentCode]);
END;
GO

IF OBJECT_ID(N'[ChatBot].[AlertConfiguration]', N'U') IS NULL
BEGIN
    CREATE TABLE [ChatBot].[AlertConfiguration]
    (
        [AlertConfigurationId] INT IDENTITY(1,1) NOT NULL,
        [AlertDefinitionId] INT NOT NULL,
        [UserId] NVARCHAR(256) NOT NULL,
        [DepartmentCode] NVARCHAR(64) NOT NULL,
        [IsEnabled] BIT NOT NULL CONSTRAINT [DF_ChatBot_AlertConfiguration_IsEnabled] DEFAULT ((0)),
        [ThresholdValue] DECIMAL(18,2) NULL,
        [ScanIntervalDays] INT NOT NULL CONSTRAINT [DF_ChatBot_AlertConfiguration_ScanIntervalDays] DEFAULT ((1)),
        [ScanIntervalSeconds] INT NULL,
        [ExtraParameters] NVARCHAR(1000) NULL,
        [LastTriggeredAt] DATETIME NULL,
        [CreatedAt] DATETIME NOT NULL CONSTRAINT [DF_ChatBot_AlertConfiguration_CreatedAt] DEFAULT (GETUTCDATE()),
        [UpdatedAt] DATETIME NULL,
        CONSTRAINT [PK_ChatBot_AlertConfiguration] PRIMARY KEY ([AlertConfigurationId]),
        CONSTRAINT [FK_ChatBot_AlertConfiguration_AlertDefinition]
            FOREIGN KEY ([AlertDefinitionId]) REFERENCES [ChatBot].[AlertDefinition]([AlertDefinitionId])
            ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ChatBot_AlertConfiguration_UserId_AlertDefinitionId' AND object_id = OBJECT_ID(N'[ChatBot].[AlertConfiguration]'))
BEGIN
    CREATE UNIQUE INDEX [IX_ChatBot_AlertConfiguration_UserId_AlertDefinitionId]
        ON [ChatBot].[AlertConfiguration]([UserId], [AlertDefinitionId]);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ChatBot_AlertConfiguration_DepartmentCode' AND object_id = OBJECT_ID(N'[ChatBot].[AlertConfiguration]'))
BEGIN
    CREATE INDEX [IX_ChatBot_AlertConfiguration_DepartmentCode]
        ON [ChatBot].[AlertConfiguration]([DepartmentCode]);
END;
GO

IF OBJECT_ID(N'[ChatBot].[AlertHistory]', N'U') IS NULL
BEGIN
    CREATE TABLE [ChatBot].[AlertHistory]
    (
        [AlertHistoryId] INT IDENTITY(1,1) NOT NULL,
        [AlertConfigurationId] INT NOT NULL,
        [AlertDefinitionId] INT NOT NULL,
        [TriggeredAt] DATETIME NOT NULL CONSTRAINT [DF_ChatBot_AlertHistory_TriggeredAt] DEFAULT (GETUTCDATE()),
        [ThresholdValue] DECIMAL(18,2) NOT NULL,
        [ActualValue] DECIMAL(18,2) NOT NULL,
        [Message] NVARCHAR(2000) NOT NULL,
        [IsRead] BIT NOT NULL CONSTRAINT [DF_ChatBot_AlertHistory_IsRead] DEFAULT ((0)),
        [IsDismissed] BIT NOT NULL CONSTRAINT [DF_ChatBot_AlertHistory_IsDismissed] DEFAULT ((0)),
        CONSTRAINT [PK_ChatBot_AlertHistory] PRIMARY KEY ([AlertHistoryId]),
        CONSTRAINT [FK_ChatBot_AlertHistory_AlertConfiguration]
            FOREIGN KEY ([AlertConfigurationId]) REFERENCES [ChatBot].[AlertConfiguration]([AlertConfigurationId])
            ON DELETE CASCADE,
        CONSTRAINT [FK_ChatBot_AlertHistory_AlertDefinition]
            FOREIGN KEY ([AlertDefinitionId]) REFERENCES [ChatBot].[AlertDefinition]([AlertDefinitionId])
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ChatBot_AlertHistory_ConfigId_TriggeredAt' AND object_id = OBJECT_ID(N'[ChatBot].[AlertHistory]'))
BEGIN
    CREATE INDEX [IX_ChatBot_AlertHistory_ConfigId_TriggeredAt]
        ON [ChatBot].[AlertHistory]([AlertConfigurationId], [TriggeredAt]);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ChatBot_AlertHistory_IsRead_IsDismissed' AND object_id = OBJECT_ID(N'[ChatBot].[AlertHistory]'))
BEGIN
    CREATE INDEX [IX_ChatBot_AlertHistory_IsRead_IsDismissed]
        ON [ChatBot].[AlertHistory]([IsRead], [IsDismissed]);
END;
GO

IF OBJECT_ID(N'[ChatBot].[ChatMessage]', N'U') IS NULL
BEGIN
    CREATE TABLE [ChatBot].[ChatMessage]
    (
        [MessageId] UNIQUEIDENTIFIER NOT NULL,
        [SessionId] UNIQUEIDENTIFIER NOT NULL,
        [Role] TINYINT NOT NULL,
        [Content] NVARCHAR(MAX) NOT NULL,
        [Model] NVARCHAR(100) NULL,
        [TokensUsed] INT NULL,
        [CreatedAt] DATETIME NOT NULL CONSTRAINT [DF_ChatBot_ChatMessage_CreatedAt] DEFAULT (GETUTCDATE()),
        [MetadataJson] NVARCHAR(MAX) NULL,
        CONSTRAINT [PK_ChatBot_ChatMessage] PRIMARY KEY ([MessageId]),
        CONSTRAINT [FK_ChatBot_ChatMessage_ChatSession]
            FOREIGN KEY ([SessionId]) REFERENCES [ChatBot].[ChatSession]([SessionId])
            ON DELETE CASCADE,
        CONSTRAINT [CK_ChatBot_ChatMessage_Role] CHECK ([Role] IN (0, 1, 2, 3))
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ChatBot_ChatMessage_SessionId' AND object_id = OBJECT_ID(N'[ChatBot].[ChatMessage]'))
BEGIN
    CREATE INDEX [IX_ChatBot_ChatMessage_SessionId]
        ON [ChatBot].[ChatMessage]([SessionId]);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ChatBot_ChatMessage_CreatedAt' AND object_id = OBJECT_ID(N'[ChatBot].[ChatMessage]'))
BEGIN
    CREATE INDEX [IX_ChatBot_ChatMessage_CreatedAt]
        ON [ChatBot].[ChatMessage]([CreatedAt]);
END;
GO
