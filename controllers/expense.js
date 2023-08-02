const ExpenseDetail = require('../models/expense');
const Leaderboard = require('../models/leaderboard');
const sequelize = require('../util/database');
const AWS = require('aws-sdk');

exports.postExpenseDetail = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const category = req.body.category;
    const description = req.body.description;
    const amount = req.body.amount;
    const user = await Leaderboard.findByPk(req.user.id);
    
    if (!user) {
      await Leaderboard.create({
        username: req.user.name,
        totalexpense: amount
      }, {transaction: t});
    } else {
      const expense = user.totalexpense;
      await user.update({totalexpense: Number(amount) + Number(expense)}, {transaction: t});
    }

    await ExpenseDetail.create({
      category: category,
      description: description,
      amount: amount,
      userId: req.user.id
    }, {transaction: t});

    await t.commit();

    res.status(200).json({message: "submitted"});
  } catch (err) {
    await t.rollback();
    console.log(err);
    res.status(500).json({message: "An error occurred"});
  }
};

exports.getExpenseDetail = async (req, res, next) => {
  const pageNumber = req.query.page;
  console.log(">>><<<", pageNumber)
  const itemsPerPage = 2; // Number of items to display per page

const offset = (pageNumber - 1) * itemsPerPage;
  try {
    const details = await req.user.getExpenses({
      limit: itemsPerPage,
      offset: offset
    });
    res.setHeader('Content-Type', 'text/html');
    res.status(200).json({detail: details, ispremium: req.user.ispremiumuser});
  } catch (err) {
    console.log(err);
    res.status(500).json({message: "An error occurred"});
  }
};

exports.deleteList = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const listItem = await ExpenseDetail.findOne({
      where: {
        id: req.params.listId,
        UserId: req.user.id
      }
    });
    const user = await Leaderboard.findByPk(req.user.id);

    const expense = user.totalexpense;
      await user.update({totalexpense: Number(expense) - Number(listItem.amount)}, {transaction: t});
    
    if (!listItem) {
      await t.rollback();
      return res.status(404).json({message: "List item not found"});
    }

    
    await listItem.destroy({transaction: t});
    await t.commit();
    res.status(200).json({message: "done"});
  } catch (err) {
    
    console.log(err);
    await t.rollback();
    res.status(500).json({message: "An error occurred"});
  }
};

function uploadToS3(data, filename){
  const BUCKET_NAME = "myexpense22";
  const IAM_USER_KEY = "AKIAQMRWA6I7TJ6QMC24";
  const IAM_USER_SECRET = "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";

  let s3bucket = new AWS.S3({
    accessKeyId: IAM_USER_KEY,
    secretAccessKey: IAM_USER_SECRET
  })

  
    var params = {
      Bucket: BUCKET_NAME,
      Key: filename,
      Body: data,
      ACL: 'public-read'
    }


    return new Promise((resolve, reject)=> {
      s3bucket.upload(params, (err, data)=> {
        if(err){
          console.log("somthing went wrong");
          reject(err);
        }else{
          console.log("success", data);
          resolve(data.Location);
        }
      });
    })
    
  
}


exports.downloadExpense = async (req, res, next) => {
  try{
    const expenses = await req.user.getExpenses();

    const stringifiedExpenses = JSON.stringify(expenses);
    const filename = `Expense/${new Date()}.txt`;
    const fileUrl = await uploadToS3(stringifiedExpenses, filename);
    console.log(fileUrl)
    res.status(200).json({fileUrl: fileUrl, success: true});
  }catch(err){
    res.status(500).json({fileUrl: "", success: false});
  }
  
}